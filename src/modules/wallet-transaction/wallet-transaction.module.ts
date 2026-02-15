import { Module } from '@nestjs/common';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { WalletTransactionService } from './wallet-transaction.service';
import { WalletTransactionController } from './wallet-transaction.controller';

@Module({
  imports: [PrismaModule],
  providers: [WalletTransactionService],
  controllers: [WalletTransactionController],
})
export class WalletTransactionModule {}
