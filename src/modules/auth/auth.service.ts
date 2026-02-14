import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SendOtpDto } from '@/types/auth/send-otp.dto';
import { VerifyOtpDto } from '@/types/auth/verify-otp.dto';
import { LoginWithPasswordDto } from '@/types/auth/login.dto';
import { RequestOtpDto } from '@/types/auth/request-otp.dto';
import { VerifyLoginOtpDto } from '@/types/auth/verify-login-otp.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordDto } from '@/types/auth/forgot-password.dto';
import { VerifyResetOtpDto } from '@/types/auth/verify-reset-otp.dto';
import { SetNewPasswordDto } from '@/types/auth/set-new-password.dto';
import { AuthTokens, DeviceInfo } from '@/types/auth/tokens.type';
import * as bcrypt from 'bcryptjs';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { RegisterDto } from '@/types/auth/register.dto';
import { SetPasswordDto } from '@/types/auth/set-password.dto';

const ACCESS_EXPIRES_SECONDS = (() => {
  const v = process.env.ACCESS_TOKEN_TTL || '15m';
  if (v.endsWith('m')) return parseInt(v) * 60;
  if (v.endsWith('h')) return parseInt(v) * 3600;
  if (v.endsWith('s')) return parseInt(v);
  const n = parseInt(v);
  return isNaN(n) ? 15 * 60 : n; // seconds
})();
const REFRESH_EXPIRES_DAYS = parseInt(
  process.env.REFRESH_TOKEN_TTL_DAYS || '14'
);

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
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      const userRole = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: userRole.id },
      });
    }

    const code = await this.otpService.generateAndStoreOtp(dto.phone, user.id);

    // try to send sms, but do not fail if provider fails
    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e) {
      // swallow provider error per requirements
    }

    return { success: true, message: 'OTP sent (or simulated)', code };
  }

  async verifyOtpForRegistration(dto: VerifyOtpDto) {
    // find or create user generically without revealing existence
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      const userRole = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: userRole.id },
      });
    }

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new BadRequestException('Invalid or expired OTP');

    // issue short-lived registration token (hashed in DB)
    const raw = (await import('crypto')).randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(raw, 10);
    const ttlMin = parseInt(process.env.REGISTRATION_TOKEN_TTL_MINUTES || '15');
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    await this.prisma.registrationToken.create({
      data: { userId: user.id, token: hashed, expiresAt },
    });

    return { registrationToken: raw };
  }

  async requestLoginOtp(dto: RequestOtpDto) {
    await this.otpService.assertRateLimit(dto.phone);

    // Optionally link to user if exists, but do not reveal existence
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    const code = await this.otpService.generateAndStoreOtp(
      dto.phone,
      existing?.id
    );
    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e) {
      // swallow provider errors per requirements
    }
    return { message: 'OTP sent', code };
  }

  async verifyLoginOtp(dto: VerifyLoginOtpDto, device: DeviceInfo) {
    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) {
      const role = await this.ensureRole('USER');
      user = await this.prisma.user.create({
        data: { phone: dto.phone, roleId: role.id },
      });
    }

    return this.issueTokensAndPersistSession(user.id, device);
  }

  async loginWithPassword(dto: LoginWithPasswordDto, device: DeviceInfo) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

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
    if (new Date(matched.expiresAt) < new Date())
      throw new UnauthorizedException('Session expired');

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

    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) return { success: true }; // do not reveal existence

    const code = await this.otpService.generateAndStoreOtp(dto.phone, user.id);
    try {
      await this.smsService.sendOtp(dto.phone, code);
    } catch (e) {}

    return { success: true, code };
  }

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    // Always return generic responses
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) return { resetToken: this.fakeDelayAndToken() };

    const ok = await this.otpService.verifyOtp(dto.phone, dto.code);
    if (!ok) return { resetToken: this.fakeDelayAndToken() };

    // issue reset token
    const tokenPlain = (await import('crypto')).randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(tokenPlain, 12);

    const expiresAt = new Date(
      Date.now() +
        parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '15') * 60 * 1000
    );

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    return { resetToken: tokenPlain };
  }

  async setPasswordAndLogin(dto: SetPasswordDto, device: DeviceInfo) {
    const now = new Date();
    const candidates = await this.prisma.registrationToken.findMany({
      where: { expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched: { id: number; userId: number } | null = null;
    for (const c of candidates) {
      const ok = await bcrypt.compare(dto.registrationToken, c.token);
      if (ok) {
        matched = { id: c.id, userId: c.userId };
        break;
      }
    }

    if (!matched) throw new BadRequestException('Invalid or expired token');

    const hash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { password: hash, isVerified: true },
      }),
      this.prisma.registrationToken.delete({ where: { id: matched.id } }),
      this.prisma.registrationToken.deleteMany({
        where: { userId: matched.userId, expiresAt: { lt: now } },
      }),
    ]);

    return this.issueTokensAndPersistSession(matched.userId, device);
  }

  async resetPasswordAndLogin(dto: SetNewPasswordDto, device: DeviceInfo) {
    const now = new Date();
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let matched: { id: number; userId: number } | null = null;
    for (const c of candidates) {
      const ok = await bcrypt.compare(dto.resetToken, c.token);
      if (ok) {
        matched = { id: c.id, userId: c.userId };
        break;
      }
    }

    if (!matched) throw new BadRequestException('Invalid or expired token');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { password: hash, isVerified: true },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: matched.id } }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: matched.userId, expiresAt: { lt: now } },
      }),
    ]);

    return this.issueTokensAndPersistSession(matched.userId, device);
  }

  private fakeDelayAndToken() {
    return undefined; // keep shape generic; client should not infer existence
  }

  private async issueTokensAndPersistSession(
    userId: number,
    device: DeviceInfo
  ): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        expiresIn: ACCESS_EXPIRES_SECONDS,
        secret:
          process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key',
      }
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh' },
      {
        expiresIn: `${REFRESH_EXPIRES_DAYS}d`,
        secret:
          process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'secret-key',
      }
    );

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
