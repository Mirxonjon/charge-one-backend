import { HttpException, HttpStatus, Injectable,  } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OTP_TTL_MINUTES = 3; // 2-5 minutes window
const OTP_RESEND_WINDOW_SECONDS = 60; // rate-limit per minute

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async assertRateLimit(phone: string) {
    const since = new Date(Date.now() - OTP_RESEND_WINDOW_SECONDS * 1000);
    const recent = await this.prisma.otpCode.findFirst({
      where: { phone, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      throw new HttpException(
        'Please wait before requesting another OTP',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  async generateAndStoreOtp(phone: string, userId?: number) {
    const code = '' + Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { phone, userId, code, expiresAt },
    });
    return code;
  }

  async verifyOtp(phone: string, code: string) {
    const now = new Date();
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, code, isUsed: false, expiresAt: { gte: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });
    // optional: invalidate all older codes for this phone
    await this.prisma.otpCode.updateMany({
      where: { phone, id: { not: otp.id } },
      data: { isUsed: true },
    });
    return true;
  }
}
