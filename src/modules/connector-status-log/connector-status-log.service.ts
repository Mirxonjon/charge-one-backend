import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateConnectorStatusLogDto } from '@/types/connector-status-log/create-connector-status-log.dto';
import { FilterConnectorStatusLogDto } from '@/types/connector-status-log/filter-connector-status-log.dto';
@Injectable()
export class ConnectorStatusLogService {
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateConnectorStatusLogDto) {
    return this.prisma.connectorStatusLog.create({ data: dto });
  }
  async findAll(query: FilterConnectorStatusLogDto) {
    const { page = 1, limit = 10, connectorId, status, from, to } = query;
    const where: any = {};
    if (connectorId) where.connectorId = connectorId;
    if (status) where.status = status;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.connectorStatusLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.connectorStatusLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
  async remove(id: number) {
    const existing = await this.prisma.connectorStatusLog.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Log not found');
    await this.prisma.connectorStatusLog.delete({ where: { id } });
    return { success: true };
  }
}
