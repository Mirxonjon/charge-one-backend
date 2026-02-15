import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateStationPricingDto } from '@/types/station-pricing/create-station-pricing.dto';
import { UpdateStationPricingDto } from '@/types/station-pricing/update-station-pricing.dto';
import { FilterStationPricingDto } from '@/types/station-pricing/filter-station-pricing.dto';
@Injectable()
export class StationPricingService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateStationPricingDto) {
    return this.prisma.stationPricing.create({ data: dto });
  }
  async findAll(query: FilterStationPricingDto) {
    const { page = 1, limit = 10, stationId } = query;
    const where: any = {};
    if (stationId) where.stationId = stationId;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.stationPricing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stationPricing.count({ where }),
    ]);
    return { items, total, page, limit };
  }
  async findOne(id: number) {
    const item = await this.prisma.stationPricing.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Pricing not found');
    return item;
  }
  async update(id: number, dto: UpdateStationPricingDto) {
    await this.findOne(id);
    return this.prisma.stationPricing.update({ where: { id }, data: dto });
  }
  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.stationPricing.delete({ where: { id } });
    return { success: true };
  }
}
