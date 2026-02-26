import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class StationLikeService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureStationExists(stationId: number) {
    const station = await this.prisma.chargingStation.findUnique({ where: { id: stationId } });
    if (!station) throw new NotFoundException('Charging station not found');
    return station;
  }

  async toggle(userId: number, stationId: number): Promise<{ liked: boolean }> {
    await this.ensureStationExists(stationId);

    const existing = await this.prisma.stationLike.findUnique({
      where: { userId_stationId: { userId, stationId } },
    });

    if (existing) {
      await this.prisma.stationLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    try {
      await this.prisma.stationLike.create({ data: { userId, stationId } });
      return { liked: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Unique constraint hit concurrently → treat as already liked
        return { liked: true };
      }
      throw e;
    }
  }

  async myLikes(userId: number, page = 1, limit = 10) {
    const where = { userId };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.stationLike.count({ where }),
      this.prisma.stationLike.findMany({
        where,
        include: {
          station: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total, page, limit };
  }

  async countForStation(stationId: number): Promise<number> {
    await this.ensureStationExists(stationId);
    return this.prisma.stationLike.count({ where: { stationId } });
  }

  async checkLiked(userId: number, stationId: number): Promise<boolean> {
    await this.ensureStationExists(stationId);
    const like = await this.prisma.stationLike.findUnique({
      where: { userId_stationId: { userId, stationId } },
      select: { id: true },
    });
    return Boolean(like);
  }
}
