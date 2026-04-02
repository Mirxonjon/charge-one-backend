import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { TransactionFiltersDto } from '@/types/transactions/transaction-filters.dto';

@Injectable()
export class WalletTransactionService {
  constructor(private prisma: PrismaService) {}

  async my(userId: number, filters: TransactionFiltersDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return { items: [], total: 0, page: filters.page ?? 1, limit: filters.limit ?? 10 };
    return this.listInternal({ ...filters, walletId: wallet.id });
  }

  async adminList(filters: TransactionFiltersDto) {
    return this.listInternal(filters);
  }

  async findOne(id: number, userId: number) {
    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user.role.name !== 'ADMIN' && transaction.wallet.userId !== userId) {
      throw new ForbiddenException('No access to this transaction');
    }

    return transaction;
  }

  private async listInternal(filters: TransactionFiltersDto & { walletId?: number }) {
    const { page = 1, limit = 10, type, from, to, minAmount, maxAmount, provider, walletId } = filters;
    const where: Prisma.WalletTransactionWhereInput = {};
    if (walletId) where.walletId = walletId;
    if (type) where.type = type as TransactionType;
    if (provider) where.provider = provider;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }
    if (minAmount || maxAmount) {
      where.amount = {} as any;
      if (minAmount) (where.amount as any).gte = new Prisma.Decimal(minAmount);
      if (maxAmount) (where.amount as any).lte = new Prisma.Decimal(maxAmount);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
