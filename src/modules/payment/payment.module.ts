import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [PrismaModule],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
