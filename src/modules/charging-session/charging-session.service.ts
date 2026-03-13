import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { NotificationService } from '@/modules/notification/notification.service';
import { CreateChargingSessionDto } from '@/types/charging-session/create-charging-session.dto';
import { UpdateChargingSessionDto } from '@/types/charging-session/update-charging-session.dto';
import { FilterChargingSessionDto } from '@/types/charging-session/filter-charging-session.dto';
import { SessionStatus } from '@prisma/client';
import { OcppServer } from '../ocpp/ocpp.server';
import { RemoteStartSessionDto } from '@/types/charging-session/remote-start-session.dto';

@Injectable()
export class ChargingSessionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private ocppServer: OcppServer
  ) { }
  async createForUser(userId: number, dto: CreateChargingSessionDto) {
    return this.prisma.chargingSession.create({
      data: {
        userId,
        connectorId: dto.connectorId,
        energyKwh: dto.energyKwh ?? 0,
        cost: dto.cost ?? 0,
        status: dto.status ?? SessionStatus.ACTIVE,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      },
    });
  }
  async adminCreate(dto: CreateChargingSessionDto) {
    if (!dto.userId)
      throw new ForbiddenException('userId is required for admin create');
    return this.prisma.chargingSession.create({
      data: {
        userId: dto.userId,
        connectorId: dto.connectorId,
        energyKwh: dto.energyKwh ?? 0,
        cost: dto.cost ?? 0,
        status: dto.status ?? SessionStatus.ACTIVE,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      },
    });
  }
  async findAllForUser(userId: number, query: FilterChargingSessionDto) {
    const { page = 1, limit = 10, status, from, to } = query;
    const where: any = { userId };
    if (status) where.status = status;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chargingSession.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.chargingSession.count({ where }),
    ]);
    return { items, total, page, limit };
  }
  async adminFindAll(query: FilterChargingSessionDto) {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      connectorId,
      from,
      to,
    } = query;
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (connectorId) where.connectorId = connectorId;
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) where.startTime.lte = new Date(to);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chargingSession.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.chargingSession.count({ where }),
    ]);
    return { items, total, page, limit };
  }
  async findOneForUser(userId: number, id: number) {
    const item = await this.prisma.chargingSession.findUnique({
      where: { id },
    });
    if (!item || item.userId !== userId)
      throw new NotFoundException('Session not found');
    return item;
  }
  async adminFindOne(id: number) {
    const item = await this.prisma.chargingSession.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Session not found');
    return item;
  }
  async adminUpdate(id: number, dto: UpdateChargingSessionDto) {
    const existing = await this.adminFindOne(id);
    const updated = await this.prisma.chargingSession.update({
      where: { id },
      data: {
        connectorId: dto.connectorId,
        energyKwh: dto.energyKwh,
        cost: dto.cost,
        status: dto.status,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });

    if (existing.status !== updated.status && updated.status === SessionStatus.COMPLETED) {
      try {
        await this.notificationService.sendToUser(updated.userId, {
          title: 'Charging Completed',
          body: 'Sizning zaryadingiz tugadi',
          type: 'SESSION_COMPLETED',
          data: { sessionId: updated.id },
        });
      } catch (e) {
        // ignore notification errors
      }
    }

    return updated;
  }
  async adminRemove(id: number) {
    await this.adminFindOne(id);
    await this.prisma.chargingSession.delete({ where: { id } });
    return { success: true };
  }

  // Frontend REST API logic to dispatch OCPP START
  async remoteStartSession(userId: number, dto: RemoteStartSessionDto) {
    const connector = await this.prisma.connector.findUnique({
      where: { id: dto.connectorId },
      include: { station: true }
    });

    if (!connector) throw new NotFoundException('Connector not found');

    // Use the real OCPP station ID from the database
    const ocppStationId = connector.station.ocppStationId;
    if (!ocppStationId) {
      throw new ForbiddenException(
        `Station "${connector.station.title}" does not have an ocppStationId set. Please configure it first.`
      );
    }
    console.log(ocppStationId, dto, connector);

    // Pre-create the session so we can return the sessionId immediately.
    // OcppService.handleStartTransaction will find and reuse this session (not create a duplicate).
    const session = await this.prisma.chargingSession.create({
      data: {
        connectorId: connector.id,
        userId,
        userCarId: dto.userCarId ?? null,
        status: SessionStatus.ACTIVE,
        energyKwh: 0,
        cost: 0,
        startTime: new Date(),
      },
    });

    try {
      await this.ocppServer.sendCallToStation(ocppStationId, 'RemoteStartTransaction', {
        connectorId: connector.connectorNumber, // OCPP connectorId = connectorNumber, NOT the DB id
        idTag: userId.toString()
      });

      return {
        success: true,
        sessionId: session.id,
        message: 'Remote start command dispatched via OCPP',
      };
    } catch (e) {
      // If OCPP dispatch failed, delete the pre-created session to keep DB clean
      await this.prisma.chargingSession.delete({ where: { id: session.id } }).catch(() => { });
      throw new ForbiddenException(`Failed to connect to station: ${e.message}`);
    }
  }

  // Frontend REST API logic to dispatch OCPP STOP
  async remoteStopSession(userId: number, sessionId: number) {
    const session = await this.prisma.chargingSession.findUnique({
      where: { id: sessionId },
      include: { connector: { include: { station: true } } }
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Not your session');

    // Use the real OCPP station ID from the database
    const ocppStationId = session.connector.station.ocppStationId;
    if (!ocppStationId) {
      throw new ForbiddenException(
        `Station "${session.connector.station.title}" does not have an ocppStationId set. Please configure it first.`
      );
    }

    try {
      await this.ocppServer.sendCallToStation(ocppStationId, 'RemoteStopTransaction', {
        transactionId: session.id
      });

      return {
        success: true,
        sessionId: session.id,
        message: 'Remote stop command dispatched via OCPP'
      };
    } catch (e) {
      throw new ForbiddenException(`Failed to connect to station: ${e.message}`);
    }
  }
}
