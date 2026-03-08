import { Module, forwardRef } from '@nestjs/common';
import { OcppService } from './ocpp.service';
import { OcppServer } from './ocpp.server';
import { ChargingSessionModule } from '../charging-session/charging-session.module';
import { ConnectorModule } from '../connector/connector.module';
import { SocketModule } from '../socket/socket.module';

@Module({
    imports: [
        forwardRef(() => ChargingSessionModule),
        ConnectorModule,
        SocketModule
    ],
    providers: [OcppService, OcppServer],
    exports: [OcppService, OcppServer],
})
export class OcppModule { }
