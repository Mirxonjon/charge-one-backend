import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WalletTransactionService } from './wallet-transaction.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { Request } from 'express';
import { TransactionFiltersDto } from '@/types/transactions/transaction-filters.dto';

@ApiTags('WalletTransactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class WalletTransactionController {
  constructor(private readonly service: WalletTransactionService) {}

  @Get('my')
  @ApiOperation({ summary: 'List my wallet transactions' })
  @ApiQuery({ name: 'type', required: false, enum: ['DEPOSIT', 'CHARGE', 'REFUND'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'minAmount', required: false })
  @ApiQuery({ name: 'maxAmount', required: false })
  my(@Req() req: Request, @Query() query: TransactionFiltersDto) {
    const userId = (req as any).user.sub as number;
    return this.service.my(userId, query);
  }

  @Get('admin')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all wallet transactions (ADMIN)' })
  @ApiQuery({ name: 'type', required: false, enum: ['DEPOSIT', 'CHARGE', 'REFUND'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'minAmount', required: false })
  @ApiQuery({ name: 'maxAmount', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'walletId', required: false })
  admin(@Query() query: TransactionFiltersDto) {
    return this.service.adminList(query);
  }
}
