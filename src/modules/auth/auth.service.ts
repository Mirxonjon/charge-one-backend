import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from '@/types/auth/register.dto';
import { VerifyOtpDto } from '@/types/auth/verify-otp.dto';
import { LoginWithOtpDto, LoginWithPasswordDto } from '@/types/auth/login.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordDto } from '@/types/auth/forgot-password.dto';
import { ResetPasswordDto } from '@/types/auth/reset-password.dto';
import { AuthTokens, DeviceInfo } from '@/types/auth/tokens.type';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';

const ACCESS_EXPIRES_SECONDS = (() => {
  const v = process.env.ACCESS_TOKEN_TTL || '15m';
  if (v.endsWith('m')) return parseInt(v) * 60;
  if (v.endsWith('h')) return parseInt(v) * 3600;
  if (v.endsWith('s')) return parseInt(v);
  const n = parseInt(v);
  return isNaN(n) ? 15 * 60 : n; // seconds
})();
const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '14');

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otpService: OtpService,
    private smsService: SmsService
  ) {}

  async register(dto: RegisterDto) {
    // rate limit per phone
    await this.otpService.assertRateLimit(dto.phone);

    // ensure user exists or create placeholder
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      const userRole = await this.ensureRole('USER');
      user = await this.prisma.user.create({ data: { phone: dto.phone, roleId: userRole.id } });
    }

    const code = await this.otpService.generateAndStoreOtp(dto.phone, user.id);

    // try to send sms, but do not fail if provider fails
    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e) {
      // swallow provider error per requirements
    }

    return { success: true, message: 'OTP sent (or simulated)' };
  }

  async verifyOtp(dto: VerifyOtpDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new BadRequestException('User not found');

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new BadRequestException('Invalid or expired OTP');

    // set password if provided
    if (dto.password) {
      const hash = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.update({ where: { id: user.id }, data: { password: hash, isVerified: true } });
    } else if (!user.isVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    }

    return this.issueTokensAndPersistSession(user.id, device);
  }

  async loginWithOtp(dto: LoginWithOtpDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new UnauthorizedException('Invalid or expired OTP');

    return this.issueTokensAndPersistSession(user.id, device);
  }

  async loginWithPassword(dto: LoginWithPasswordDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokensAndPersistSession(user.id, device);
  }

  async refresh(refreshToken: string, device: DeviceInfo): Promise<AuthTokens> {
    // verify signature first
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.session.findMany({
      where: { userId: payload.sub },
      orderBy: { createdAt: 'desc' },
    });

    if (!sessions || sessions.length === 0) {
      throw new UnauthorizedException('Session expired');
    }

    let matched: { id: number; expiresAt: Date } | null = null;
    for (const s of sessions) {
      const ok = await bcrypt.compare(refreshToken, s.refreshToken);
      if (ok) {
        matched = { id: s.id, expiresAt: s.expiresAt };
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Invalid refresh token');
    if (new Date(matched.expiresAt) < new Date()) throw new UnauthorizedException('Session expired');

    // rotate refresh token: delete matched and create new
    await this.prisma.session.delete({ where: { id: matched.id } });

    return this.issueTokensAndPersistSession(payload.sub, device);
  }

  async logout(userId: number, device: DeviceInfo) {
    // delete sessions matching user and optionally userAgent/ip
    await this.prisma.session.deleteMany({ where: { userId } });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.otpService.assertRateLimit(dto.phone);

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) return { success: true }; // do not reveal existence

    const code = await this.otpService.generateAndStoreOtp(dto.phone, user.id);
    try { await this.smsService.sendOtp(dto.phone, code); } catch (e) {}

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new BadRequestException('Invalid request');

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new BadRequestException('Invalid or expired OTP');

    const hash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hash } });

    return { success: true };
  }

  private async issueTokensAndPersistSession(userId: number, device: DeviceInfo): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId }, { expiresIn: ACCESS_EXPIRES_SECONDS, secret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key' });
    const refreshToken = await this.jwt.signAsync({ sub: userId, type: 'refresh' }, { expiresIn: `${REFRESH_EXPIRES_DAYS}d`, secret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key' });

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken: hashedRefresh,
        ipAddress: device.ip,
        userAgent: device.userAgent,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES_SECONDS,
    };
  }

  private async ensureRole(name: 'USER' | 'ADMIN') {
    let role = await this.prisma.role.findUnique({ where: { name } as any });
    if (!role) role = await this.prisma.role.create({ data: { name } });
    return role;
  }
}
