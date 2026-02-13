import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private logger = new Logger(SmsService.name);

  async sendOtp(phone: string, code: string) {
    // Integrate real SMS provider here. For now, log and simulate success.
    this.logger.log(`Sending OTP ${code} to ${phone}`);
    return true;
  }
}
