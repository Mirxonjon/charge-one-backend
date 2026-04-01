import { Controller, Post, Get, Delete, Param, ParseIntPipe, Body, Req, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ClickService } from './click.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';

import { CreateInvoiceDto, AddCardDto, VerifyCardDto, PayWithTokenDto } from '../../types/click/click.dto';

@ApiTags('Click Payments')
@Controller('click')
export class ClickController {
    constructor(private readonly clickService: ClickService) { }

    @Post('invoice')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate a Click Checkout URL (Invoice) for wallet top-up' })
    async createInvoice(@Req() req: Request, @Body() dto: CreateInvoiceDto) {
        const userId = (req as any).user.sub;
        return this.clickService.generateInvoiceUrl(userId, dto.amount);
    }

    // Click Webhook: PREPARE
    @Post('prepare')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Click Webhook for Prepare action' })
    @ApiHeader({ name: 'click_sign_string', description: 'MD5 hash from Click' })
    async clickPrepare(@Body() body: any, @Res() res: Response) {
        try {
            const result = await this.clickService.prepare(body);
            console.log('================ CLICK PREPARE RESPONSE ================');
            console.log(result);
            console.log('========================================================');

            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send(result);
        } catch (e) {
            return { error: -8, error_note: 'UNKNOWN ERROR' };
        }
    }

    // Click Webhook: COMPLETE
    @Post('complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Click Webhook for Complete action' })
    @ApiHeader({ name: 'click_sign_string', description: 'MD5 hash from Click' })
    async clickComplete(@Body() body: any, @Res() res: Response) {
        try {
            const result = await this.clickService.complete(body);
            console.log('================ CLICK COMPLETE RESPONSE ================');
            console.log(result);
            console.log('=========================================================');
            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send(result);
        } catch (e) {
            res.set('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
                .send({ error: -8, error_note: 'UNKNOWN ERROR' });
        }
    }

    @Get('cards')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get saved Click cards' })
    async getCards(@Req() req: Request) {
        const userId = (req as any).user.sub;
        return this.clickService.getSavedCards(userId);
    }

    @Post('cards/add')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request to add a new card to Click (Tokenization Step 1)' })
    async addCard(@Req() req: Request, @Body() dto: AddCardDto) {
        const userId = (req as any).user.sub;
        return this.clickService.createCardToken(userId, dto.cardNumber, dto.expireDate);
    }

    @Post('cards/verify')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify the added card with SMS code (Tokenization Step 2)' })
    async verifyCard(@Req() req: Request, @Body() dto: VerifyCardDto) {
        const userId = (req as any).user.sub;
        return this.clickService.verifyCardToken(userId, dto.cardId, dto.smsCode);
    }

    @Post('cards/pay')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Top up wallet using a verified saved card (Tokenization Step 3)' })
    async payWithToken(@Req() req: Request, @Body() dto: PayWithTokenDto) {
        const userId = (req as any).user.sub;
        return this.clickService.payWithToken(userId, dto.cardId, dto.amount);
    }

    @Delete('cards/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a saved card by ID' })
    async deleteCard(@Req() req: Request, @Param('id', ParseIntPipe) cardId: number) {
        const userId = (req as any).user.sub;
        return this.clickService.deleteCard(userId, cardId);
    }
}
