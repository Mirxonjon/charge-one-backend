import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateChargingStationDto } from '@/types/charging-station/create-charging-station.dto';
import { UpdateChargingStationDto } from '@/types/charging-station/update-charging-station.dto';
import { FilterChargingStationDto } from '@/types/charging-station/filter-charging-station.dto';

@Injectable()
export class ChargingStationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChargingStationDto) {
    return this.prisma.chargingStation.create({ data: dto });
  }

  async findAll(query: FilterChargingStationDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      operatorId,
      isActive,
      from,
      to,
      lat,
      lng,
      radiusKm,
    } = query;

    const where: any = {};
    if (operatorId) where.operatorId = operatorId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    let stations = await this.prisma.chargingStation.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: { operator: true },
    });

    // location filtering in-memory; for production use PostGIS/earthdistance
    if (lat !== undefined && lng !== undefined && radiusKm !== undefined) {
      const R = 6371; // km
      const toRad = (v: number) => (v * Math.PI) / 180;
      stations = stations.filter((s) => {
        const dLat = toRad(s.latitude - lat);
        const dLng = toRad(s.longitude - lng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat)) *
            Math.cos(toRad(s.latitude)) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d <= radiusKm;
      });
    }

    const total = await this.prisma.chargingStation.count({ where });
    return { items: stations, total, page, limit };
  }

  async findOne(id: number) {
    const item = await this.prisma.chargingStation.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Charging station not found');
    return item;
  }

  async update(id: number, dto: UpdateChargingStationDto) {
    await this.findOne(id);
    return this.prisma.chargingStation.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.chargingStation.delete({ where: { id } });
    return { success: true };
  }
}
