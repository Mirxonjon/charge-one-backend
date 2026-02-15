import { Module } from '@nestjs/common';
import { ChargingStationService } from './charging-station.service';
import { ChargingStationController } from './charging-station.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ChargingStationService],
  controllers: [ChargingStationController],
})
export class ChargingStationModule {}
