import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { CreateConnectorDto } from '@/types/connector/create-connector.dto';
import { UpdateConnectorDto } from '@/types/connector/update-connector.dto';
import { FilterConnectorDto } from '@/types/connector/filter-connector.dto';
import { ConnectorStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class ConnectorService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateConnectorDto) {
    const { type_id, ...rest } = dto as any;
    const data: any = { ...rest };
    if (type_id !== undefined) data.typeId = type_id;
    return this.prisma.connector.create({ data });
  }

  async findAll(query: FilterConnectorDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', stationId, status, type_id } = query;
    const where: any = {};
    if (stationId) where.stationId = stationId;
    if (type_id) where.typeId = type_id;
    if (status) where.status = status as ConnectorStatus;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.connector.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: { station: true ,  },
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
    const { type_id, ...rest } = dto as any;
    const data: any = { ...rest };
    if (type_id !== undefined) data.typeId = type_id;
    return this.prisma.connector.update({ where: { id }, data });
  }

  async generateQrCode(id: number) {
    const item = await this.findOne(id);
    // @ts-ignore
    if (item.qrCode) return item;

    const qrCode = randomUUID();
    return this.prisma.connector.update({
      where: { id },
      // @ts-ignore
      data: { qrCode },
    });
  }

  async getQrCodeBuffer(id: number): Promise<Buffer> {
    const item = await this.generateQrCode(id);
    // @ts-ignore
    const qrText = item.qrCode;
    return QRCode.toBuffer(qrText);
  }

  async findByQrCode(qrCode: string) {
    const item = await this.prisma.connector.findUnique({
      // @ts-ignore
      where: { qrCode },
      include: {
        station: {
          include: {
            operator: true,
            pricing: true,
          },
        },
        connectorType: true,
      },
    });

    if (!item) throw new NotFoundException('Connector not found for this QR code');
    return item;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.connector.delete({ where: { id } });
    return { success: true };
  }
}
