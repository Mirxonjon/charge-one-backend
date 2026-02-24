import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private logger = new Logger(SmsService.name);

  async sendOtp(phone: string, code: string) {
    const url = 'https://gate.coachingzona.uz/send';

    const payload = {
      phones: [phone], // masalan: "+998974409931"
      text: `Sizning tasdiqlash kodingiz: ${code}`,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':
            '13540aad97c8ee88b74cbc3b97580ce251217418138182c9e0e959aeea667b15',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error('SMS sending failed', data);
        return false;
      }

      this.logger.log(`OTP ${code} sent to ${phone}`);
      return true;
    } catch (error) {
      this.logger.error('SMS provider error', error);
      return false;
    }
  }
}
