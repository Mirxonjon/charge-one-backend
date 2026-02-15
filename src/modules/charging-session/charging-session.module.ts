import { Module } from '@nestjs/common';
import { ChargingSessionService } from './charging-session.service';
import { ChargingSessionController } from './charging-session.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  providers: [ChargingSessionService],
  controllers: [ChargingSessionController],
})
export class ChargingSessionModule {}
