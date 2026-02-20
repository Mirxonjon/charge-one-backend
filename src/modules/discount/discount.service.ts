import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateDiscountDto } from '@/types/discount/create-discount.dto';
import { UpdateDiscountDto } from '@/types/discount/update-discount.dto';
import { FilterDiscountDto } from '@/types/discount/filter-discount.dto';

@Injectable()
export class DiscountService {
  constructor(private prisma: PrismaService) {}

  private validateXor(dto: { percent?: number | null; fixedPrice?: string | null }) {
    const hasPercent = dto.percent !== undefined && dto.percent !== null;
    const hasFixed = dto.fixedPrice !== undefined && dto.fixedPrice !== null;
    if ((hasPercent && hasFixed) || (!hasPercent && !hasFixed)) {
      throw new BadRequestException('Either percent or fixedPrice must be provided (but not both)');
    }
    if (hasPercent && (dto.percent! <= 0 || dto.percent! > 100)) {
      throw new BadRequestException('percent must be > 0 and <= 100');
    }
    if (hasFixed && Number(dto.fixedPrice) <= 0) {
      throw new BadRequestException('fixedPrice must be > 0');
    }
  }

  private async assertConnectorBelongs(stationId: number, connectorId?: number | null) {
    if (!connectorId) return;
    const connector = await this.prisma.connector.findUnique({ where: { id: connectorId } });
    if (!connector) throw new BadRequestException('Connector not found');
    if (connector.stationId !== stationId) {
      throw new BadRequestException('Connector does not belong to the specified station');
    }
  }

  async create(dto: CreateDiscountDto) {
    if (new Date(dto.startTime) >= new Date(dto.endTime)) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }
    this.validateXor(dto);
    await this.assertConnectorBelongs(dto.stationId, dto.connectorId);

    return this.prisma.discount.create({
      data: {
        stationId: dto.stationId,
        percent: dto.percent ?? null,
        fixedPrice: dto.fixedPrice ? dto.fixedPrice : null,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateDiscountDto) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');

    if (dto.startTime && dto.endTime && new Date(dto.startTime) >= new Date(dto.endTime)) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    if (dto.percent !== undefined || dto.fixedPrice !== undefined) {
      this.validateXor({ percent: dto.percent ?? null, fixedPrice: dto.fixedPrice ?? null });
    }

    if (dto.stationId || dto.connectorId) {
      await this.assertConnectorBelongs(dto.stationId ?? discount.stationId,);
    }

    return this.prisma.discount.update({
      where: { id },
      data: {
        stationId: dto.stationId ?? undefined,
        percent: dto.percent === undefined ? undefined : dto.percent,
        fixedPrice: dto.fixedPrice === undefined ? undefined : dto.fixedPrice,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  async delete(id: number) {
    await this.prisma.discount.delete({ where: { id } });
    return { success: true };
  }

  async getById(id: number) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async list(filters: FilterDiscountDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', stationId, connectorId, isActive, activeAt } = filters;

    const where: any = {};
    if (stationId) where.stationId = stationId;
    if (connectorId !== undefined) where.connectorId = connectorId;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    if (activeAt) {
      const at = new Date(activeAt);
      where.startTime = { lte: at };
      where.endTime = { gte: at };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.discount.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.discount.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit } };
  }
}
