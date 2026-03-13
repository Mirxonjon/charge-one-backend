import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChargingStation, ConnectorStatus, SessionStatus } from '@prisma/client';
import { FrontendGateway } from '../socket/frontend.gateway';

@Injectable()
export class OcppService {
    private readonly logger = new Logger(OcppService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly frontendGateway: FrontendGateway
    ) { }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Finds a ChargingStation by its OCPP station ID (e.g. "CP001").
     * Returns null if not found.
     */
    private async findStation(ocppStationId: string): Promise<ChargingStation | null> {
        const station = await this.prisma.chargingStation.findFirst({
            where: { ocppStationId },
        });
        if (!station) {
            this.logger.warn(`Station with ocppStationId="${ocppStationId}" not found in DB.`);
        }
        return station;
    }

    /**
     * Finds a Connector using the station DB id and the OCPP connectorNumber.
     * Returns null if not found.
     */
    private async findConnector(stationDbId: number, connectorNumber: number) {
        const connector = await this.prisma.connector.findUnique({
            where: {
                stationId_connectorNumber: {
                    stationId: stationDbId,
                    connectorNumber,
                },
            },
        });
        if (!connector) {
            this.logger.warn(
                `Connector #${connectorNumber} not found for station DB id=${stationDbId}.`
            );
        }
        return connector;
    }

    // ─── Station Online/Offline Tracking ──────────────────────────────────────

    public async handleStationConnected(ocppStationId: string) {
        const result = await this.prisma.chargingStation.updateMany({
            where: { ocppStationId },
            data: { isOnline: true },
        });
        if (result.count === 0) {
            this.logger.warn(`[${ocppStationId}] handleStationConnected: no station found, isOnline not updated.`);
        } else {
            this.logger.log(`[${ocppStationId}] Station marked ONLINE.`);
        }
    }

    public async handleStationDisconnected(ocppStationId: string) {
        const result = await this.prisma.chargingStation.updateMany({
            where: { ocppStationId },
            data: { isOnline: false },
        });
        if (result.count === 0) {
            this.logger.warn(`[${ocppStationId}] handleStationDisconnected: no station found, isOnline not updated.`);
        } else {
            this.logger.log(`[${ocppStationId}] Station marked OFFLINE.`);
        }
    }

    // ─── OCPP Message Handlers ────────────────────────────────────────────────

    public async handleBootNotification(ocppStationId: string, payload: any) {
        this.logger.log(`[${ocppStationId}] BootNotification: ${JSON.stringify(payload)}`);

        // Update online status and heartbeat directly by ocppStationId
        const result = await this.prisma.chargingStation.updateMany({
            where: { ocppStationId },
            data: { isOnline: true, lastHeartbeat: new Date() },
        });
        if (result.count > 0) {
            this.logger.debug(`[${ocppStationId}] Station marked ONLINE via BootNotification.`);
        } else {
            this.logger.warn(`[${ocppStationId}] BootNotification: station not found in DB — ocppStationId not set?`);
        }

        return {
            status: 'Accepted',
            currentTime: new Date().toISOString(),
            interval: 30,
        };
    }

    public async handleStatusNotification(ocppStationId: string, payload: any) {
        this.logger.log(`[${ocppStationId}] StatusNotification: ${JSON.stringify(payload)}`);

        const { connectorId, status } = payload;

        if (connectorId && status) {
            const station = await this.findStation(ocppStationId);
            if (!station) return {};

            const connector = await this.findConnector(station.id, connectorId);
            if (!connector) return {};

            try {
                const mappedStatus: ConnectorStatus = this.mapStatus(status);

                await this.prisma.connector.update({
                    where: { id: connector.id },
                    data: { status: mappedStatus },
                });

                await this.prisma.connectorStatusLog.create({
                    data: {
                        status: mappedStatus,
                        connectorId: connector.id,
                        timestamp: new Date(),
                    },
                });

                this.frontendGateway.emitConnectorStatus(ocppStationId, connectorId, status);

            } catch (error) {
                this.logger.error(
                    `Failed to update Status for connector #${connectorId} on ${ocppStationId}: ${error.message}`
                );
            }
        }

        return {};
    }

    public async handleHeartbeat(ocppStationId: string, payload: any) {
        this.logger.debug(`[${ocppStationId}] Heartbeat`);

        const station = await this.findStation(ocppStationId);
        if (station) {
            await this.prisma.chargingStation.update({
                where: { id: station.id },
                data: { lastHeartbeat: new Date() },
            });
        }

        return {
            currentTime: new Date().toISOString(),
        };
    }

    public async handleStartTransaction(ocppStationId: string, payload: any) {
        this.logger.log(`[${ocppStationId}] StartTransaction: ${JSON.stringify(payload)}`);
        const { connectorId, idTag, meterStart, timestamp } = payload;

        try {
            const station = await this.findStation(ocppStationId);
            if (!station) {
                return { transactionId: 0, idTagInfo: { status: 'Rejected' } };
            }

            const connector = await this.findConnector(station.id, connectorId);
            if (!connector) {
                return { transactionId: 0, idTagInfo: { status: 'Rejected' } };
            }

            // Try to reuse a pre-created session (from remoteStartSession) for this connector.
            // This prevents duplicate sessions when the flow is: API → RemoteStartTransaction → station StartTransaction.
            const userId = parseInt(idTag) || 1;
            const existingSession = await this.prisma.chargingSession.findFirst({
                where: {
                    connectorId: connector.id,
                    userId,
                    status: SessionStatus.ACTIVE,
                },
                orderBy: { startTime: 'desc' },
            });

            const session = existingSession
                ? await this.prisma.chargingSession.update({
                    where: { id: existingSession.id },
                    data: { startTime: new Date(timestamp || Date.now()) },
                })
                : await this.prisma.chargingSession.create({
                    data: {
                        connector: { connect: { id: connector.id } },
                        status: SessionStatus.ACTIVE,
                        energyKwh: 0,
                        cost: 0,
                        startTime: new Date(timestamp || Date.now()),
                        user: { connect: { id: userId } },
                    },
                });

            return {
                transactionId: session.id,
                idTagInfo: { status: 'Accepted' },
            };

        } catch (e) {
            this.logger.error(`Failed StartTransaction: ${e.message}`);
            return {
                transactionId: Math.floor(Math.random() * 10000) + 1000,
                idTagInfo: { status: 'Rejected' },
            };
        }
    }

    public async handleMeterValues(ocppStationId: string, payload: any) {
        const { connectorId, transactionId, meterValue } = payload;

        if (!transactionId || !meterValue || !Array.isArray(meterValue)) {
            return {};
        }

        const latestSample = meterValue[meterValue.length - 1];
        if (latestSample && latestSample.sampledValue) {

            let powerW = 0;
            let totalEnergyWh = 0;

            for (const sample of latestSample.sampledValue) {
                if (sample.measurand === 'Power.Active.Import') {
                    powerW = parseFloat(sample.value);
                }
                if (sample.measurand === 'Energy.Active.Import.Register') {
                    totalEnergyWh = parseFloat(sample.value);
                }
            }

            const energyKwh = totalEnergyWh / 1000;

            const session = await this.prisma.chargingSession.findUnique({
                where: { id: transactionId },
                include: {
                    connector: {
                        include: {
                            station: { include: { pricing: true } },
                        },
                    },
                },
            });

            const pricePerKwh =
                session?.connector?.pricePerKwh ||
                session?.connector?.station?.pricing?.pricePerKwh ||
                2500;

            try {
                const currentSession = await this.prisma.chargingSession.update({
                    where: { id: transactionId },
                    data: {
                        energyKwh: energyKwh,
                        cost: energyKwh * pricePerKwh,
                    },
                });

                this.frontendGateway.emitSessionMeterUpdated(
                    transactionId,
                    energyKwh,
                    powerW,
                    currentSession.cost
                );
            } catch (e) {
                this.logger.error(`Error updating session meter for tx ${transactionId}`);
            }
        }

        return {};
    }

    public async handleStopTransaction(ocppStationId: string, payload: any) {
        this.logger.log(`[${ocppStationId}] StopTransaction: ${JSON.stringify(payload)}`);
        const { transactionId, meterStop, timestamp } = payload;

        try {
            const finalEnergyKwh = meterStop ? meterStop / 1000 : 0;

            const session = await this.prisma.chargingSession.findUnique({
                where: { id: transactionId },
                include: {
                    connector: {
                        include: {
                            station: { include: { pricing: true } },
                        },
                    },
                },
            });

            const pricePerKwh =
                session?.connector?.pricePerKwh ||
                session?.connector?.station?.pricing?.pricePerKwh ||
                2500;

            const finalCost = finalEnergyKwh * pricePerKwh;

            await this.prisma.chargingSession.update({
                where: { id: transactionId },
                data: {
                    status: SessionStatus.COMPLETED,
                    endTime: new Date(timestamp || Date.now()),
                    energyKwh: finalEnergyKwh > 0 ? finalEnergyKwh : undefined,
                    cost: finalCost > 0 ? finalCost : undefined,
                },
            });

        } catch (e) {
            this.logger.error(`Error stopping transaction ${transactionId}: ${e.message}`);
        }

        return {
            idTagInfo: { status: 'Accepted' },
        };
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    public handleIncomingCallResult(ocppStationId: string, messageId: string, payload: any) {
        this.logger.debug(`[${ocppStationId}] Received CALLRESULT for msg ${messageId}:`, payload);
    }

    private mapStatus(status: string): ConnectorStatus {
        switch (status) {
            case 'Available':
                return ConnectorStatus.AVAILABLE;
            case 'Occupied':
            case 'Charging':
            case 'Preparing':
            case 'SuspendedEV':
                return ConnectorStatus.OCCUPIED;
            case 'Faulted':
            case 'Unavailable':
                return ConnectorStatus.OUT_OF_SERVICE;
            default:
                return ConnectorStatus.AVAILABLE;
        }
    }
}
