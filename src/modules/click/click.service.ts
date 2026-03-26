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

    // 2. WEBHOOK CALLBACK (Prepare & Complete)
    async handleCallback(data: any) {
        try {
            this.logger.log(`Click Callback Received: ${JSON.stringify(data)}`);

            const {
                click_trans_id,
                service_id,
                click_paydoc_id,
                merchant_trans_id,
                amount,
                action,
                error,
                error_note,
                sign_time,
                sign_string,
                merchant_prepare_id,
            } = data;

            // Validate Signature
            const isComplete = parseInt(action) === 1;
            const { SECRET_KEY } = this.ENV;

            const payload = `${click_trans_id}${service_id}${SECRET_KEY}${merchant_trans_id}${isComplete ? merchant_prepare_id : ''}${amount}${action}${sign_time}`;
            const md5Hash = crypto.createHash('md5').update(payload).digest('hex');

            if (md5Hash !== sign_string) {
                this.logger.error('Invalid signature from Click', { expected: md5Hash, received: sign_string });
                return { error: -1, error_note: 'SIGN CHECK FAILED' };
            }

            // Check transaction existence in our DB
            const walletTxId = parseInt(merchant_trans_id);
            if (isNaN(walletTxId)) {
                return { error: -5, error_note: 'INVALID MERCHANT TRANS ID' };
            }

            const walletTx = await this.prisma.walletTransaction.findUnique({
                where: { id: walletTxId },
                include: { wallet: true },
            });

            // Validations
            if (!walletTx) {
                return { error: -5, error_note: 'TRANSACTION NOT FOUND' };
            }
            if (parseFloat(walletTx.amount.toString()) !== parseFloat(amount)) {
                return { error: -2, error_note: 'INCORRECT AMOUNT' };
            }

            // Action 0: PREPARE
            if (parseInt(action) === 0) {
                if (walletTx.status !== 'PENDING') {
                    return { error: -4, error_note: 'ALREADY PAID OR CANCELLED' };
                }

                // Save prepare state to ClickTransaction
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
                    click_trans_id,
                    merchant_trans_id,
                    merchant_prepare_id: walletTxId, // We use standard walletTxId as prepare ID
                    error: 0,
                    error_note: 'Success',
                };
            }

            // Action 1: COMPLETE
            if (parseInt(action) === 1) {
                if (walletTx.status === 'SUCCESS') {
                    return { error: -4, error_note: 'ALREADY PAID' };
                }
                if (parseInt(error) < 0) {
                    // Transaction cancelled by Click
                    await this.prisma.walletTransaction.update({
                        where: { id: walletTxId },
                        data: { status: 'FAILED' },
                    });
                    await this.prisma.clickTransaction.update({
                        where: { clickTransId: BigInt(click_trans_id) },
                        data: { status: -1 },
                    });
                    return { error: -9, error_note: 'TRANSACTION CANCELLED' }; // specific error mapping if needed
                }

                // Apply payment
                await this.prisma.$transaction(async (tx) => {
                    await tx.walletTransaction.update({
                        where: { id: walletTxId },
                        data: { status: 'SUCCESS' },
                    });

                    await tx.wallet.update({
                        where: { id: walletTx.walletId },
                        data: { balance: { increment: amount } },
                    });

                    await tx.clickTransaction.update({
                        where: { clickTransId: BigInt(click_trans_id) },
                        data: { status: 1 },
                    });
                });

                return {
                    click_trans_id,
                    merchant_trans_id,
                    merchant_confirm_id: walletTxId,
                    error: 0,
                    error_note: 'Success',
                };
            }

            return { error: -3, error_note: 'ACTION NOT FOUND' };

        } catch (e) {
            this.logger.error('Click Webhook Failed', e);
            return { error: -8, error_note: 'UNKNOWN ERROR' };
        }
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
            const res = await fetch(`${this.CLICK_API_URL}/request`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;

            if (data.error_code !== 0) {
                throw new BadRequestException(data.error_note || 'Card registration failed');
            }

            const cardToken = data.card_token;

            // Save to database as unverified
            await this.prisma.savedCard.upsert({
                where: { cardToken },
                update: {},
                create: {
                    userId,
                    cardToken,
                    cardNumber: this.maskCard(cardNumber),
                    isVerified: false,
                },
            });

            return { success: true, message: 'SMS code sent', phone: data.phone_number, cardToken };
        } catch (e) {
            this.logger.error('Click Add Card Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    // 4. VERIFY SMS CODE
    async verifyCardToken(userId: number, cardToken: string, smsCode: string) {
        const { SERVICE_ID } = this.ENV;

        const savedCard = await this.prisma.savedCard.findUnique({ where: { cardToken } });
        if (!savedCard || savedCard.userId !== userId) {
            throw new BadRequestException('Card token not found');
        }

        const payload = {
            service_id: parseInt(SERVICE_ID),
            card_token: cardToken,
            sms_code: smsCode,
        };

        try {
            const res = await fetch(`${this.CLICK_API_URL}/verify`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;

            if (data.error_code !== 0) {
                throw new BadRequestException(data.error_note || 'Card verification failed');
            }

            await this.prisma.savedCard.update({
                where: { cardToken },
                data: { isVerified: true },
            });

            return { success: true, message: 'Card verified successfully' };
        } catch (e) {
            this.logger.error('Click Verify Card Error', e);
            throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
        }
    }

    // 5. PAY WITH SAVED TOKEN
    async payWithToken(userId: number, cardToken: string, amount: number) {
        if (amount <= 0) throw new BadRequestException('Invalid amount');

        const savedCard = await this.prisma.savedCard.findUnique({ where: { cardToken } });
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
            card_token: cardToken,
            amount: amount,
            merchant_trans_id: tx.id.toString(),
        };

        try {
            const res = await fetch(`${this.CLICK_API_URL}/payment`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json() as any;

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
            select: { cardToken: true, cardNumber: true, createdAt: true },
        });
    }

    private maskCard(cardNumber: string) {
        if (cardNumber.length === 16) {
            return `${cardNumber.slice(0, 6)}******${cardNumber.slice(12)}`;
        }
        return cardNumber;
    }
}
