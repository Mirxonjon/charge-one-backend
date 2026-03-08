import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true }) // runs on default HTTP port alongside API
export class FrontendGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(FrontendGateway.name);

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        this.logger.log('Frontend Socket.io Gateway Initialized');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.debug(`Frontend Client Connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.debug(`Frontend Client Disconnected: ${client.id}`);
    }

    /**
     * Boradcasts connector status changes to mobile apps or dashboard
     */
    public emitConnectorStatus(stationId: string, connectorId: number, status: string) {
        this.server.emit('connector_status_changed', { stationId, connectorId, status });
    }

    /**
     * Broadcasts meter values to update charging animations
     */
    public emitSessionMeterUpdated(transactionId: number, energyKwh: number, powerW: number, cost: number) {
        this.server.emit('session_meter_updated', {
            sessionId: transactionId,
            energyKwh,
            powerKw: powerW / 1000,
            cost,
        });
    }
}
