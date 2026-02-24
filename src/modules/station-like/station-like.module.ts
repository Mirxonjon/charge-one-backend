import { Module } from '@nestjs/common';
import { StationLikeController } from './station-like.controller';
import { StationLikeService } from './station-like.service';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StationLikeController],
  providers: [StationLikeService],
  exports: [StationLikeService],
})
export class StationLikeModule {}
