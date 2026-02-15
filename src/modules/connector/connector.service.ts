import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateConnectorDto } from '@/types/connector/create-connector.dto';
import { UpdateConnectorDto } from '@/types/connector/update-connector.dto';
import { FilterConnectorDto } from '@/types/connector/filter-connector.dto';
import { ConnectorStatus } from '@prisma/client';

@Injectable()
export class ConnectorService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConnectorDto) {
    return this.prisma.connector.create({ data: dto });
  }

  async findAll(query: FilterConnectorDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', stationId, status } = query;
    const where: any = {};
    if (stationId) where.stationId = stationId;
    if (status) where.status = status as ConnectorStatus;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.connector.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: { station: true },
      }),
      this.prisma.connector.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const item = await this.prisma.connector.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Connector not found');
    return item;
  }

  async update(id: number, dto: UpdateConnectorDto) {
    await this.findOne(id);
    return this.prisma.connector.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.connector.delete({ where: { id } });
    return { success: true };
  }
}
