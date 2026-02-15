import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { Request } from 'express';
import { WalletDepositDto } from '@/types/wallet/deposit.dto';
import { WalletRefundDto } from '@/types/wallet/refund.dto';
import { ListWalletsDto } from '@/types/wallet/list-wallets.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my wallet (USER)' })
  my(@Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.getMyWallet(userId);
  }

  @Get('admin')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin list wallets' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'currency', required: false, example: 'UZS' })
  adminList(@Query() query: ListWalletsDto) {
    const { page = 1, limit = 10, currency } = query;
    return this.service.adminList(page, limit, currency);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create deposit transaction (USER)' })
  @ApiBody({ type: WalletDepositDto, examples: { basic: { value: { amount: '100000.00', provider: 'CLICK' } } } })
  deposit(@Req() req: Request, @Body() dto: WalletDepositDto) {
    const userId = (req as any).user.sub as number;
    return this.service.deposit(userId, dto.amount, dto.provider);
  }

  @Post('refund')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Refund to user wallet (ADMIN)' })
  @ApiBody({ type: WalletRefundDto })
  refund(@Body() dto: WalletRefundDto) {
    return this.service.refundAdmin(dto.userId, dto.amount, dto.sessionId);
  }
}
