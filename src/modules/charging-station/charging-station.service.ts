import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateChargingStationDto } from '@/types/charging-station/create-charging-station.dto';
import { UpdateChargingStationDto } from '@/types/charging-station/update-charging-station.dto';
import { FilterChargingStationDto } from '@/types/charging-station/filter-charging-station.dto';

@Injectable()
export class ChargingStationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChargingStationDto) {
    const created = await this.prisma.chargingStation.create({ data: dto });
    return created;
  }

  async findAll(query: FilterChargingStationDto, userId?: number) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      priceSort,
      operatorId,
      isActive,
      powerType,
      search,
      connectorType,
      connectorStatus,
      chargingSpeed,
      from,
      to,
      lat,
      lng,
      radiusKm,
    } = query;

    const where: any = {};

    if (operatorId) where.operatorId = operatorId;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (powerType) where.powerType = powerType;
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive', // katta-kichik harf farq qilmaydi
      };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (connectorType || connectorStatus || chargingSpeed) {
      where.connectors = {
        some: {},
      };

      if (connectorType) {
        where.connectors.some.type = connectorType;
      }

      if (connectorStatus) {
        where.connectors.some.status = connectorStatus;
      }

      if (chargingSpeed) {
        switch (chargingSpeed) {
          case 'STANDARD':
            where.connectors.some.powerKw = { gte: 7, lte: 44 };
            break;
          case 'SEMI_FAST':
            where.connectors.some.powerKw = { gte: 60, lte: 80 };
            break;
          case 'FAST':
            where.connectors.some.powerKw = { gte: 120, lte: 180 };
            break;
          case 'ULTRA':
            where.connectors.some.powerKw = { gt: 200 };
            break;
        }
      }
    }

    let stations = (await this.prisma.chargingStation.findMany({
      where,
      include: {
        operator: {
          select: {
            title: true,
            color: true,
          },
        },
        pricing: true,
        connectors: true,
      },
      orderBy: priceSort
        ? {
            pricing: {
              pricePerKwh: priceSort, // 'asc' | 'desc'
            },
          }
        : undefined,
    })) as any;

    // 🔥 DISTANCE LOGIC
    if (lat !== undefined && lng !== undefined) {
      const R = 6371;
      const toRad = (v: number) => (v * Math.PI) / 180;

      stations = stations.map((s) => {
        const dLat = toRad(s.latitude - lat);
        const dLng = toRad(s.longitude - lng);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat)) *
            Math.cos(toRad(s.latitude)) *
            Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;

        return {
          ...s,
          distanceKm: Number(d.toFixed(2)), // <-- masofa qo‘shiladi
        };
      });

      if (radiusKm !== undefined) {
        stations = stations.filter((s) => s.distanceKm <= radiusKm);
      }

      stations.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    let likedStationIds: number[] = [];

    if (userId) {
      const likes = await this.prisma.stationLike.findMany({
        where: {
          userId,
          stationId: { in: stations.map((s) => s.id) },
        },
        select: { stationId: true },
      });

      likedStationIds = likes.map((l) => l.stationId);
    }

    stations = stations.map((s) => ({
      ...s,
      isLiked: userId ? likedStationIds.includes(s.id) : false,
    }));

    const total = stations.length;

    const paginated = stations.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      total,
      page,
      limit,
    };
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
    const updated = await this.prisma.chargingStation.update({
      where: { id },
      data: dto,
    });
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.chargingStation.delete({ where: { id } });
    return { success: true };
  }
}
