import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { OcppService } from './ocpp.service';

@Injectable()
export class OcppServer implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OcppServer.name);
    private wss: WebSocket.Server;

    // Active connections mapped by stationId
    private activeConnections: Map<string, WebSocket> = new Map();

    constructor(private readonly ocppService: OcppService) { }

    onModuleInit() {
        this.startServer();
    }

    onModuleDestroy() {
        this.stopServer();
    }

    private startServer() {
        // Start WebSocket server on port from env
        const PORT = process.env.OCPP_PORT ? parseInt(process.env.OCPP_PORT, 10) : 9051;
        this.wss = new WebSocket.Server({ port: PORT });

        this.logger.log(`OCPP WebSocket Server listening on ws://localhost:${PORT}/ocpp/:stationId`);

        this.wss.on('connection', (ws: WebSocket, req) => {
            // Extract stationId from the URL, e.g., /ocpp/CP001
            const defaultPathMatch = req.url?.match(/\/ocpp\/([^\/]+)/);
            const stationId = defaultPathMatch ? defaultPathMatch[1] : 'UNKNOWN_STATION';

            this.logger.log(`Station Connected: ${stationId}`);
            this.activeConnections.set(stationId, ws);

            // Mark station online in DB
            this.ocppService.handleStationConnected(stationId).catch(e =>
                this.logger.error(`Failed to mark station ${stationId} online: ${e.message}`)
            );

            ws.on('message', async (data: WebSocket.Data) => {
                try {
                    // Parse the incoming string as an array (OCPP JSON RPC over WebSockets)
                    const messageArray = JSON.parse(data.toString());

                    if (!Array.isArray(messageArray)) {
                        throw new Error("Invalid format. Expected JSON Array");
                    }

                    const messageTypeId = messageArray[0];

                    // Type 2 is CALL (Request from Station)
                    if (messageTypeId === 2) {
                        const [, messageId, action, payload] = messageArray;
                        await this.handleIncomingCall(ws, stationId, messageId, action, payload);
                    }
                    // Type 3 is CALLRESULT (Response from Station)
                    else if (messageTypeId === 3) {
                        const [, messageId, payload] = messageArray;
                        this.ocppService.handleIncomingCallResult(stationId, messageId, payload);
                    }
                } catch (error) {
                    this.logger.error(`Error processing message from ${stationId}: ${error.message}`);
                }
            });

            ws.on('close', () => {
                this.logger.log(`Station Disconnected: ${stationId}`);
                this.activeConnections.delete(stationId);

                // Mark station offline in DB
                this.ocppService.handleStationDisconnected(stationId).catch(e =>
                    this.logger.error(`Failed to mark station ${stationId} offline: ${e.message}`)
                );
            });

            ws.on('error', (error) => {
                this.logger.error(`WebSocket Error from ${stationId}: ${error.message}`);
            });
        });

    }

    private async handleIncomingCall(ws: WebSocket, stationId: string, messageId: string, action: string, payload: any) {
        this.logger.debug(`[${stationId}] Received CALL: ${action}`, payload);

        try {
            let responsePayload = {};

            switch (action) {
                case 'BootNotification':
                    responsePayload = await this.ocppService.handleBootNotification(stationId, payload);
                    break;
                case 'StatusNotification':
                    responsePayload = await this.ocppService.handleStatusNotification(stationId, payload);
                    break;
                case 'Heartbeat':
                    responsePayload = await this.ocppService.handleHeartbeat(stationId, payload);
                    break;
                case 'StartTransaction':
                    responsePayload = await this.ocppService.handleStartTransaction(stationId, payload);
                    break;
                case 'MeterValues':
                    responsePayload = await this.ocppService.handleMeterValues(stationId, payload);
                    break;
                case 'StopTransaction':
                    responsePayload = await this.ocppService.handleStopTransaction(stationId, payload);
                    break;
                default:
                    this.logger.warn(`[${stationId}] Action not supported: ${action}`);
                    return; // Alternatively, send a CALLERROR (Type 4)
            }

            // Send Response back to station
            if (responsePayload) {
                this.sendCallResult(ws, messageId, responsePayload);
            }
        } catch (e) {
            this.logger.error(`Error handling ${action} for ${stationId}: ${e.message}`);
            // Send CallError
            const errorMsg = [
                4,
                messageId,
                "InternalError",
                "An internal error occurred",
                {}
            ];
            ws.send(JSON.stringify(errorMsg));
        }
    }

    public sendCallResult(ws: WebSocket, messageId: string, payload: any) {
        const response = [
            3,           // MessageTypeId for CALLRESULT
            messageId,  // MessageId linking request to response
            payload     // Result Payload
        ];
        ws.send(JSON.stringify(response));
    }

    // Sends a CALL request to a specific station (e.g. RemoteStartTransaction)
    public async sendCallToStation(stationId: string, action: string, payload: any): Promise<void> {
        const ws = this.activeConnections.get(stationId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error(`Station ${stationId} is not connected.`);
        }

        // Generate a unique message ID (in reality, track this to resolve promises when station responds)
        const messageId = Math.random().toString(36).substring(2, 10);
        const request = [
            2,        // MessageTypeId for CALL
            messageId,
            action,
            payload
        ];

        ws.send(JSON.stringify(request));
        this.logger.debug(`[${stationId}] Sent CALL: ${action}`);

        // Note: In a fully complete OCPP server, we would map `messageId` to a Promise
        // and resolve it in handleIncomingCallResult. Simulating fire-and-forget for now 
        // as frontend will wait for "session_meter_updated" or "connector_status_changed" via socket.io instead.
    }

    private stopServer() {
        if (this.wss) {
            this.wss.clients.forEach(client => client.terminate());
            this.wss.close();
            this.logger.log('OCPP WebSocket Server stopped.');
        }
    }
}
