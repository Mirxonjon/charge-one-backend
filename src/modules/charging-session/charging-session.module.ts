import { Module } from '@nestjs/common';
import { ChargingSessionService } from './charging-session.service';
import { ChargingSessionController } from './charging-session.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { NotificationModule } from '@/modules/notification/notification.module';
@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [ChargingSessionService],
  controllers: [ChargingSessionController],
})
export class ChargingSessionModule {}
