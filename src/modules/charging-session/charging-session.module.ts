import { Module, forwardRef } from '@nestjs/common';
import { ChargingSessionService } from './charging-session.service';
import { ChargingSessionController } from './charging-session.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { OcppModule } from '../ocpp/ocpp.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    forwardRef(() => OcppModule)
  ],
  providers: [ChargingSessionService],
  controllers: [ChargingSessionController],
})
export class ChargingSessionModule { }
