import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectorStatus, SessionStatus } from '@prisma/client';
import { FrontendGateway } from '../socket/frontend.gateway';

@Injectable()
export class OcppService {
    private readonly logger = new Logger(OcppService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly frontendGateway: FrontendGateway
    ) { }

    public async handleBootNotification(stationId: string, payload: any) {
        this.logger.log(`[${stationId}] BootNotification: ${JSON.stringify(payload)}`);

        // Verify if station exists
        const station = await this.prisma.chargingStation.findFirst({
            where: { id: parseInt(stationId.replace(/[^0-9]/g, '')) || 1 } // Naive map for test
        });

        if (station) {
            this.logger.debug(`Station found: ${station.title}`);
        }

        // Default Accepted response for simulator
        return {
            status: 'Accepted',
            currentTime: new Date().toISOString(),
            interval: 30, // Heartbeat interval in seconds
        };
    }

    public async handleStatusNotification(stationId: string, payload: any) {
        this.logger.log(`[${stationId}] StatusNotification: ${JSON.stringify(payload)}`);

        // connectorId: 1, status: "Available"
        const { connectorId, status, errorCode } = payload;

        if (connectorId && status) {
            try {
                const mappedStatus: ConnectorStatus = this.mapStatus(status);

                // In a real app we need to map `stationId` and `connectorId` to the actual Database IDs
                // For simplicity, we assume `connectorId` from payload maps to our Prisma `Connector.id`
                await this.prisma.connector.update({
                    where: { id: connectorId },
                    data: { status: mappedStatus }
                });

                await this.prisma.connectorStatusLog.create({
                    data: {
                        status: mappedStatus,
                        connectorId: parseInt(connectorId) || 1, // Fallback purely for mock
                        timestamp: new Date()
                    }
                });

                this.frontendGateway.emitConnectorStatus(stationId, connectorId, status);

            } catch (error) {
                this.logger.error(`Failed to update Status for connector ${connectorId}: ${error.message}`);
            }
        }

        return {}; // StatusNotification responds with empty payload
    }

    public async handleHeartbeat(stationId: string, payload: any) {
        this.logger.debug(`[${stationId}] Heartbeat`);
        return {
            currentTime: new Date().toISOString(),
        };
    }

    public async handleStartTransaction(stationId: string, payload: any) {
        this.logger.log(`[${stationId}] StartTransaction: ${JSON.stringify(payload)}`);
        const { connectorId, idTag, meterStart, timestamp } = payload;

        try {
            // Create a new Charging Session in the database
            const session = await this.prisma.chargingSession.create({
                data: {
                    connector: { connect: { id: parseInt(connectorId) || 1 } },
                    status: SessionStatus.ACTIVE,
                    energyKwh: 0,
                    cost: 0,
                    startTime: new Date(timestamp || Date.now()),
                    user: { connect: { id: parseInt(idTag) || 1 } }
                }
            });

            // Answer with the generated transactionId (session.id)
            return {
                transactionId: session.id,
                idTagInfo: {
                    status: "Accepted"
                }
            };
        } catch (e) {
            this.logger.error(`Failed StartTransaction: ${e.message}`);
            // Fallback transaction ID if db fails for simulator to keep running
            return {
                transactionId: Math.floor(Math.random() * 10000) + 1000,
                idTagInfo: { status: "Rejected" }
            }
        }
    }

    public async handleMeterValues(stationId: string, payload: any) {
        // Meter value comes every 10 seconds.
        // console.log(`[${stationId}] MeterValues: ${JSON.stringify(payload)}`);

        const { connectorId, transactionId, meterValue } = payload;

        if (!transactionId || !meterValue || !Array.isArray(meterValue)) {
            return {};
        }

        const latestSample = meterValue[meterValue.length - 1]; // latest timeline block
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

            // Fetch dynamic price
            const session = await this.prisma.chargingSession.findUnique({
                where: { id: transactionId },
                include: {
                    connector: {
                        include: {
                            station: { include: { pricing: true } }
                        }
                    }
                }
            });

            // Determine price: Connector specific price first, then Station specific price, then fallback 2500
            const pricePerKwh = session?.connector?.pricePerKwh
                || session?.connector?.station?.pricing?.pricePerKwh
                || 2500;

            // Update active session with current consumed energy
            try {
                const currentSession = await this.prisma.chargingSession.update({
                    where: { id: transactionId },
                    data: {
                        energyKwh: energyKwh,
                        cost: energyKwh * pricePerKwh // Dynamic cost calculation
                    }
                });

                this.frontendGateway.emitSessionMeterUpdated(transactionId, energyKwh, powerW, currentSession.cost);
            } catch (e) {
                this.logger.error(`Error updating session meter for tx ${transactionId}`);
            }
        }

        return {};
    }

    public async handleStopTransaction(stationId: string, payload: any) {
        this.logger.log(`[${stationId}] StopTransaction: ${JSON.stringify(payload)}`);
        const { transactionId, meterStop, timestamp, idTag } = payload;

        try {
            const finalEnergyKwh = meterStop ? (meterStop / 1000) : 0;

            // Fetch dynamic price
            const session = await this.prisma.chargingSession.findUnique({
                where: { id: transactionId },
                include: {
                    connector: {
                        include: {
                            station: { include: { pricing: true } }
                        }
                    }
                }
            });

            const pricePerKwh = session?.connector?.pricePerKwh
                || session?.connector?.station?.pricing?.pricePerKwh
                || 2500;

            const finalCost = finalEnergyKwh * pricePerKwh;

            await this.prisma.chargingSession.update({
                where: { id: transactionId },
                data: {
                    status: SessionStatus.COMPLETED,
                    endTime: new Date(timestamp || Date.now()),
                    energyKwh: finalEnergyKwh > 0 ? finalEnergyKwh : undefined,
                    cost: finalCost > 0 ? finalCost : undefined,
                }
            });

        } catch (e) {
            this.logger.error(`Error stopping transaction ${transactionId}: ${e.message}`);
        }

        return {
            idTagInfo: {
                status: "Accepted"
            }
        };
    }

    // --- Utility ---
    public handleIncomingCallResult(stationId: string, messageId: string, payload: any) {
        this.logger.debug(`[${stationId}] Received CALLRESULT for msg ${messageId}:`, payload);
        // Wait for accepted / rejected
    }

    private mapStatus(status: string): ConnectorStatus {
        switch (status) {
            case 'Available': return ConnectorStatus.AVAILABLE;
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
