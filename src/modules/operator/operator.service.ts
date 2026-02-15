import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateOperatorDto } from '@/types/operator/create-operator.dto';
import { UpdateOperatorDto } from '@/types/operator/update-operator.dto';
import { FilterOperatorDto } from '@/types/operator/filter-operator.dto';

@Injectable()
export class OperatorService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOperatorDto) {
    return this.prisma.operator.create({ data: dto });
  }

  async findAll(query: FilterOperatorDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', from, to } = query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.operator.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operator.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const item = await this.prisma.operator.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Operator not found');
    return item;
  }

  async update(id: number, dto: UpdateOperatorDto) {
    await this.findOne(id);
    return this.prisma.operator.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.operator.delete({ where: { id } });
    return { success: true };
  }
}
