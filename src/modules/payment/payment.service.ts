import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PaymentMethod } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { PaymentCreateDto, PaymentUpdateDto } from '@/types/payments/payment.dto';
import { PaymentFiltersDto } from '@/types/payments/payment-filters.dto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: PaymentCreateDto) {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be > 0');
    // ensure session exists
    await this.prisma.chargingSession.findUniqueOrThrow({ where: { id: dto.sessionId } });
    return this.prisma.payment.create({ data: { sessionId: dto.sessionId, amount, method: dto.method as PaymentMethod } });
  }

  async update(id: number, dto: PaymentUpdateDto) {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('Amount must be > 0');
    await this.findOne(id);
    return this.prisma.payment.update({ where: { id }, data: { amount, method: dto.method as PaymentMethod } });
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.payment.delete({ where: { id } });
    return { success: true };
  }

  async list(filters: PaymentFiltersDto) {
    const { page = 1, limit = 10, method, from, to, minAmount, maxAmount } = filters;
    const where: Prisma.PaymentWhereInput = {};
    if (method) where.method = method as any;
    if (from || to) {
      where.createdAt = {} as any;
      if (from) (where.createdAt as any).gte = new Date(from);
      if (to) (where.createdAt as any).lte = new Date(to);
    }
    if (minAmount || maxAmount) {
      where.amount = {} as any;
      if (minAmount) (where.amount as any).gte = new Prisma.Decimal(minAmount);
      if (maxAmount) (where.amount as any).lte = new Prisma.Decimal(maxAmount);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
