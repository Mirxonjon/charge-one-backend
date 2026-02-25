import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';

export type NotificationPayload = {
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseAdminService,
  ) {}

  async registerDevice(userId: number, deviceToken: string, platform: string) {
    try {
      const existing = await this.prisma.userDevice.findUnique({
        where: { userId_deviceToken: { userId, deviceToken } },
      });
      if (existing) {
        return this.prisma.userDevice.update({
          where: { userId_deviceToken: { userId, deviceToken } },
          data: { platform, isActive: true },
        });
      }
      return await this.prisma.userDevice.create({
        data: { userId, deviceToken, platform, isActive: true },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        return this.prisma.userDevice.update({
          where: { userId_deviceToken: { userId, deviceToken } },
          data: { platform, isActive: true },
        });
      }
      throw e;
    }
  }

  async removeDevice(userId: number, deviceToken: string) {
    const existing = await this.prisma.userDevice.findUnique({
      where: { userId_deviceToken: { userId, deviceToken } },
    });
    if (!existing) return { success: true };
    await this.prisma.userDevice.update({
      where: { userId_deviceToken: { userId, deviceToken } },
      data: { isActive: false },
    });
    return { success: true };
  }

  async sendToUser(userId: number, payload: NotificationPayload) {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId, isActive: true },
      select: { deviceToken: true },
    });

    // Save notification
    await this.prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: payload.data as any,
      },
    });

    if (devices.length === 0) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.deviceToken);
    const res = await this.sendMulticast(tokens, payload.title, payload.body, payload.data);
    return { success: true, sent: res?.successCount ?? 0 };
  }

  async sendToMany(userIds: number[], payload: NotificationPayload) {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { deviceToken: true },
    });

    // Save notifications
    await this.prisma.$transaction(
      userIds.map((uid) =>
        this.prisma.notification.create({
          data: {
            userId: uid,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            data: payload.data as any,
          },
        }),
      ),
    );

    if (devices.length === 0) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.deviceToken);
    const res = await this.sendMulticast(tokens, payload.title, payload.body, payload.data);
    return { success: true, sent: res?.successCount ?? 0 };
  }

  async broadcast(payload: NotificationPayload) {
    const devices = await this.prisma.userDevice.findMany({
      where: { isActive: true },
      select: { deviceToken: true, userId: true },
    });

    await this.prisma.$transaction(
      devices
        .filter((d) => !!d.userId)
        .map((d) =>
          this.prisma.notification.create({
            data: {
              userId: d.userId!,
              title: payload.title,
              body: payload.body,
              type: payload.type,
              data: payload.data as any,
            },
          }),
        ),
    );

    if (devices.length === 0) return { success: true, sent: 0 };

    const tokens = devices.map((d) => d.deviceToken);
    const res = await this.sendMulticast(tokens, payload.title, payload.body, payload.data);
    return { success: true, sent: res?.successCount ?? 0 };
  }

  async listMy(userId: number, page = 1, limit = 10) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { items, total, page, limit };
  }

  async markRead(userId: number, id: number) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async sendPush(token: string, title: string, body: string, data?: Record<string, any>) {
    if (!this.firebase.messaging) return null;
    try {
      const message: any = {
        token,
        notification: { title, body },
        data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)])) : undefined,
        android: {
          notification: { sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      };
      return await this.firebase.messaging.send(message);
    } catch (e) {
      this.logger.error('sendPush error', e as any);
      return null;
    }
  }

  async sendMulticast(tokens: string[], title: string, body: string, data?: Record<string, any>) {
    if (!this.firebase.messaging) return null;
    try {
      const message: any = {
        tokens,
        notification: { title, body },
        data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)])) : undefined,
        android: {
          notification: { sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      };
      return await this.firebase.messaging.sendEachForMulticast(message);
    } catch (e) {
      this.logger.error('sendMulticast error', e as any);
      return null;
    }
  }
}
