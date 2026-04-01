import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ClickService {
    private readonly logger = new Logger(ClickService.name);

    // Constants
    private readonly CLICK_API_URL = 'https://api.click.uz/v2/merchant/card_token';

    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
    ) { }

    private get ENV() {
        return {
            MERCHANT_ID: this.config.get<string>('CLICK_MERCHANT_ID'),
            SERVICE_ID: this.config.get<string>('CLICK_SERVICE_ID'),
            MERCHANT_USER_ID: this.config.get<string>('CLICK_MERCHANT_USER_ID'),
            SECRET_KEY: this.config.get<string>('CLICK_SECRET_KEY'),
        };
    }

    // 1. GENERATE INVOICE (Redirect Link)
    async generateInvoiceUrl(userId: number, amount: number) {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        const wallet = await this.prisma.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, balance: 0 },
        });

        const tx = await this.prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: 'DEPOSIT',
                amount,
                provider: 'CLICK',
                status: 'PENDING',
            },
        });

        const { MERCHANT_ID, SERVICE_ID } = this.ENV;
        const url = `https://my.click.uz/services/pay?service_id=${SERVICE_ID}&merchant_id=${MERCHANT_ID}&amount=${amount}&transaction_param=${tx.id}`;

        return { success: true, url, transactionId: tx.id };
    }

    // Click Service logic

    private checkSignature(data: any, isComplete: boolean): boolean {
        const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string, merchant_prepare_id } = data;
        const { SECRET_KEY } = this.ENV;
        const payload = `${click_trans_id}${service_id}${SECRET_KEY}${merchant_trans_id}${isComplete ? merchant_prepare_id : ''}${amount}${action}${sign_time}`;
        const md5Hash = crypto.createHash('md5').update(payload).digest('hex');

        if (md5Hash !== sign_string) {
            this.logger.error('Invalid signature from Click', { expected: md5Hash, received: sign_string });
            return false;
        }
        return true;
    }

    // PREPARE (Action = 0)
    async prepare(data: any) {
        this.logger.log(`Click PREPARE Webhook Received: ${JSON.stringify(data)}`);
        const { click_trans_id, merchant_trans_id, amount, sign_time } = data;

        if (!this.checkSignature(data, false)) {
            return { error: -1, error_note: 'SIGN CHECK FAILED' };
        }

        if (!merchant_trans_id || merchant_trans_id.toString().trim() === '') {
            this.logger.log('Click AutoPay webhook PREPARE without merchant_trans_id received. Returning error: 0 to let Token Payment proceed.');
            const time = new Date().getTime()
            return {
                click_trans_id: Number(click_trans_id),
                merchant_trans_id: merchant_trans_id || "",
                // merchant_prepare_id: time,
                merchant_prepare_id: merchant_trans_id,
                error: 0,
                error_note: 'Success',
            };
        }

        const walletTxId = parseInt(merchant_trans_id);
        if (isNaN(walletTxId)) {
            this.logger.warn(`Click Prepare Error: INVALID MERCHANT TRANS ID (NaN) - received: ${merchant_trans_id}`);
            return { error: -5, error_note: 'INVALID MERCHANT TRANS ID' };
        }

        const walletTx = await this.prisma.walletTransaction.findUnique({ where: { id: walletTxId } });
        if (!walletTx) {
            this.logger.warn(`Click Prepare Error: TRANSACTION NOT FOUND - ID: ${walletTxId}`);
            return { error: -5, error_note: 'TRANSACTION NOT FOUND' };
        }

        const dbAmount = parseFloat(walletTx.amount.toString());
        const clickAmount = parseFloat(amount);
        const isExactMatch = Math.abs(dbAmount - clickAmount) < 0.01;
        const isCommissionMatch = Math.abs((dbAmount * 1.01) - clickAmount) < 0.01;

        if (!isExactMatch && !isCommissionMatch) {
            this.logger.warn(`Click Prepare Error: INCORRECT AMOUNT - Expected: ${dbAmount} or ${dbAmount * 1.01}, Received: ${clickAmount} UZS`);
            return { error: -2, error_note: 'INCORRECT AMOUNT' };
        }

        if (walletTx.status !== 'PENDING') {
            this.logger.warn(`Click Prepare Error: ALREADY PAID OR CANCELLED - Tx Status: ${walletTx.status}`);
            return { error: -4, error_note: 'ALREADY PAID OR CANCELLED' };
        }

        await this.prisma.clickTransaction.upsert({
            where: { clickTransId: BigInt(click_trans_id) },
            update: {},
            create: {
                clickTransId: BigInt(click_trans_id),
                merchantTransId: merchant_trans_id,
                amount,
                status: 0,
                signTime: sign_time,
            },
        });

        return {
            click_trans_id: Number(click_trans_id),
            merchant_trans_id: String(merchant_trans_id),
            merchant_prepare_id: Number(walletTxId),
            error: 0,
            error_note: 'Success',
        };
    }

    // COMPLETE (Action = 1)
    async complete(data: any) {
        this.logger.log(`Click COMPLETE Webhook Received: ${JSON.stringify(data)}`);
        const { click_trans_id, merchant_trans_id, amount, error, error_note } = data;

        if (!this.checkSignature(data, true)) {
            return { error: -1, error_note: 'SIGN CHECK FAILED' };
        }

        if (!merchant_trans_id || merchant_trans_id.toString().trim() === '') {
            this.logger.log('Click AutoPay webhook COMPLETE without merchant_trans_id received. Returning error: 0 to let Token Payment proceed.');
            return {
                click_trans_id: Number(click_trans_id),
                merchant_trans_id: merchant_trans_id || "",
                merchant_confirm_id: 0,
                error: 0,
                error_note: 'Success',
            };
        }

        const walletTxId = parseInt(merchant_trans_id);
        if (isNaN(walletTxId)) {
            this.logger.warn(`Click Complete Error: INVALID MERCHANT TRANS ID (NaN) - received: ${merchant_trans_id}`);
            return { error: -5, error_note: 'INVALID MERCHANT TRANS ID' };
        }

        const walletTx = await this.prisma.walletTransaction.findUnique({ where: { id: walletTxId }, include: { wallet: true } });
        if (!walletTx) {
            this.logger.warn(`Click Complete Error: TRANSACTION NOT FOUND - ID: ${walletTxId}`);
            return { error: -5, error_note: 'TRANSACTION NOT FOUND' };
        }

        const dbAmount = parseFloat(walletTx.amount.toString());
        const clickAmount = parseFloat(amount);
        const isExactMatch = Math.abs(dbAmount - clickAmount) < 0.01;
        const isCommissionMatch = Math.abs((dbAmount * 1.01) - clickAmount) < 0.01;

        if (!isExactMatch && !isCommissionMatch) {
            this.logger.warn(`Click Complete Error: INCORRECT AMOUNT - Expected: ${dbAmount} or ${dbAmount * 1.01}, Received: ${clickAmount} UZS`);
            return { error: -2, error_note: 'INCORRECT AMOUNT' };
        }

        if (walletTx.status === 'SUCCESS') {
            this.logger.warn(`Click Complete Error: ALREADY PAID - Tx Status is SUCCESS`);
            return { error: -4, error_note: 'ALREADY PAID' };
        }

        if (parseInt(error) < 0) {
            this.logger.warn(`Click Complete Error: TRANSACTION CANCELLED BY CLICK - Click error code: ${error}, note: ${error_note}`);
            await this.prisma.walletTransaction.update({
                where: { id: walletTxId },
                data: { status: 'FAILED' },
            });
            await this.prisma.clickTransaction.update({
                where: { clickTransId: BigInt(click_trans_id) },
                data: { status: -1 },
            });
            return { error: -9, error_note: 'TRANSACTION CANCELLED' };
        }

        // Apply payment
        await this.prisma.$transaction(async (tx) => {
            await tx.walletTransaction.update({
                where: { id: walletTxId },
                data: { status: 'SUCCESS' },
            });

            await tx.wallet.update({
                where: { id: walletTx.walletId },
                data: { balance: { increment: walletTx.amount } },
            });

            await tx.clickTransaction.upsert({
                where: { clickTransId: BigInt(click_trans_id) },
                update: { status: 1 },
                create: {
                    clickTransId: BigInt(click_trans_id),
                    merchantTransId: merchant_trans_id,
                    amount,
                    status: 1,
                    signTime: new Date().toISOString()
                }
            });
        });

        return {
            click_trans_id: Number(click_trans_id),
            merchant_trans_id: String(merchant_trans_id),
            merchant_confirm_id: Number(walletTxId),
            error: 0,
            error_note: 'Success',
        };
    }

    // Auth Header Generator for Click V2 API
    private getAuthHeaders() {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const { MERCHANT_USER_ID, SECRET_KEY } = this.ENV;

        // Auth = SHA1(timestamp + SecretKey)
        const signature = crypto.createHash('sha1').update(timestamp + SECRET_KEY).digest('hex');
        const authHeader = `${MERCHANT_USER_ID}:${signature}:${timestamp}`;

        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Auth': authHeader,
        };
    }

    // 3. SECURE CARD SAVING: ADD CARD
    async createCardToken(userId: number, cardNumber: string, expireDate: string) {
        const { SERVICE_ID } = this.ENV;

        // Check if card exists
        const existing = await this.prisma.savedCard.findFirst({
            where: { userId, cardNumber: this.maskCard(cardNumber) }
        });
        if (existing && existing.isVerified) {
            throw new BadRequestException('Card already saved');
        }

        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_number: cardNumber,
            expire_date: expireDate,
        };

        try {
            const headers = this.getAuthHeaders();
            this.logger.log(`[CLICK API REQUEST]: ${this.CLICK_API_URL}/request | Headers: ${JSON.stringify(headers)} | Body: ${JSON.stringify(payload)}`);
            const res = await fetch(`${this.CLICK_API_URL}/request`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;

            if (data.error_code !== 0) {
                throw new BadRequestException(data.error_note || 'Card registration failed');
            }

            const cardToken = data.card_token;

            // Save to database as unverified (token stays backend-only)
            const savedCard = await this.prisma.savedCard.upsert({
                where: { cardToken },
                update: {},
                create: {
                    userId,
                    cardToken,
                    cardNumber: this.maskCard(cardNumber),
                    isVerified: false,
                },
            });

            // Return only the DB id — never expose cardToken to frontend
            return { success: true, message: 'SMS code sent', phone: data.phone_number, cardId: savedCard.id };
        } catch (e) {
            this.logger.error('Click Add Card Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    // 4. VERIFY SMS CODE
    async verifyCardToken(userId: number, cardId: number, smsCode: string) {
        const { SERVICE_ID } = this.ENV;

        // Lookup token by ID — token never leaves the backend
        const savedCard = await this.prisma.savedCard.findUnique({ where: { id: cardId } });
        if (!savedCard || savedCard.userId !== userId) {
            throw new BadRequestException('Card not found');
        }

        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_token: savedCard.cardToken, // used internally only
            sms_code: smsCode,
        };

        try {
            const headers = this.getAuthHeaders();
            this.logger.log(`[CLICK API REQUEST]: ${this.CLICK_API_URL}/verify | Headers: ${JSON.stringify(headers)} | Body: ${JSON.stringify(payload)}`);
            const res = await fetch(`${this.CLICK_API_URL}/verify`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;

            if (data.error_code !== 0) {
                throw new BadRequestException(data.error_note || 'Card verification failed');
            }

            await this.prisma.savedCard.update({
                where: { id: cardId },
                data: { isVerified: true },
            });

            return { success: true, message: 'Card verified successfully' };
        } catch (e) {
            this.logger.error('Click Verify Card Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    // 5. PAY WITH SAVED TOKEN
    async payWithToken(userId: number, cardId: number, amount: number) {
        if (amount <= 0) throw new BadRequestException('Invalid amount');

        // Lookup token by ID — token never leaves the backend
        const savedCard = await this.prisma.savedCard.findUnique({ where: { id: cardId } });
        if (!savedCard || savedCard.userId !== userId || !savedCard.isVerified) {
            throw new BadRequestException('Card not verified or found');
        }

        const wallet = await this.prisma.wallet.upsert({
            where: { userId },
            update: {},
            create: { userId, balance: 0 },
        });

        const tx = await this.prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: 'DEPOSIT',
                amount,
                provider: 'CLICK',
                status: 'PENDING',
            },
        });

        const { SERVICE_ID } = this.ENV;
        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_token: savedCard.cardToken, // resolved from DB by cardId — never from frontend
            amount: amount,
            transaction_parameter: tx.id.toString(),
        };

        try {
            const headers = this.getAuthHeaders();
            this.logger.log(`[CLICK API REQUEST]: ${this.CLICK_API_URL}/payment | Headers: ${JSON.stringify(headers)} | Body: ${JSON.stringify(payload)}`);
            const res = await fetch(`${this.CLICK_API_URL}/payment`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;

            console.log('================ CLICK PAY WITH TOKEN RESPONSE ================');
            console.log(data);
            console.log('=========================================================');

            if (data.error_code !== 0) {
                await this.prisma.walletTransaction.update({
                    where: { id: tx.id },
                    data: { status: 'FAILED' },
                });
                throw new BadRequestException(data.error_note || 'Payment failed');
            }

            // Success! Update balances
            await this.prisma.$transaction(async (ptx) => {
                await ptx.walletTransaction.update({
                    where: { id: tx.id },
                    data: { status: 'SUCCESS' },
                });

                await ptx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: amount } },
                });
            });

            return { success: true, message: 'Payment successful', transactionId: tx.id };
        } catch (e) {
            this.logger.error('Click Pay With Token Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    async getSavedCards(userId: number) {
        return this.prisma.savedCard.findMany({
            where: { userId, isVerified: true },
            // cardToken is intentionally excluded — never expose to frontend
            select: { id: true, cardNumber: true, createdAt: true },
        });
    }

    // 6. DELETE SAVED CARD
    async deleteCard(userId: number, cardId: number) {
        const savedCard = await this.prisma.savedCard.findUnique({ where: { id: cardId } });

        if (!savedCard || savedCard.userId !== userId) {
            throw new BadRequestException('Card not found or access denied');
        }

        const { SERVICE_ID } = this.ENV;

        try {
            if (savedCard.cardToken) {
                const headers = this.getAuthHeaders();
                this.logger.log(`[CLICK API REQUEST]: DELETE ${this.CLICK_API_URL}/${SERVICE_ID}/${savedCard.cardToken} | Headers: ${JSON.stringify(headers)}`);

                const res = await fetch(`${this.CLICK_API_URL}/${SERVICE_ID}/${savedCard.cardToken}`, {
                    method: 'DELETE',
                    headers,
                });

                const data = await res.json() as any;

                if (data.error_code !== 0) {
                    throw new BadRequestException(data.error_note || 'Click tizimidan kartani o`chirishda xatolik yuz berdi');
                }
            }

            await this.prisma.savedCard.delete({ where: { id: cardId } });
            return { success: true, message: 'Card deleted successfully' };
        } catch (e) {
            this.logger.error('Click Delete Card Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    private maskCard(cardNumber: string) {
        if (cardNumber.length === 16) {
            return `${cardNumber.slice(0, 6)}******${cardNumber.slice(12)}`;
        }
        return cardNumber;
    }
}
