import { Module } from '@nestjs/common';
import { StationPricingService } from './station-pricing.service';
import { StationPricingController } from './station-pricing.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  providers: [StationPricingService],
  controllers: [StationPricingController],
})
export class StationPricingModule {}
