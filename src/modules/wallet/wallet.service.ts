import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(userId: number) {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.wallet.create({ data: { userId } });
  }

  async getMyWallet(userId: number) {
    return this.getOrCreateWallet(userId);
  }

  async adminList(page = 1, limit = 10, currency?: string) {
    const where: Prisma.WalletWhereInput = {};
    if (currency) where.currency = currency;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.wallet.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'asc' } }),
      this.prisma.wallet.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async deposit(userId: number, amountStr: string, provider?: string) {
    // validate
    const amount = new Prisma.Decimal(amountStr);
    if (amount.lte(0)) throw new BadRequestException('Amount must be > 0');

    // Serializable transaction to avoid race conditions
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });

      const trx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.DEPOSIT,
          amount,
          provider,
          status: TransactionStatus.SUCCESS,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance.plus(amount) },
      });

      return trx;
    }, { isolationLevel: 'Serializable' });
  }

  async refundAdmin(userId: number, amountStr: string, sessionId?: number) {
    const amount = new Prisma.Decimal(amountStr);
    if (amount.lte(0)) throw new BadRequestException('Amount must be > 0');
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });

      const trx = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.REFUND,
          amount,
          sessionId: sessionId ?? null,
          status: TransactionStatus.SUCCESS,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance.plus(amount) },
      });

      return trx;
    }, { isolationLevel: 'Serializable' });
  }
}
