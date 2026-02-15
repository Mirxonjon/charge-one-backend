import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { PaymentCreateDto, PaymentUpdateDto } from '@/types/payments/payment.dto';
import { PaymentFiltersDto } from '@/types/payments/payment-filters.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment log (ADMIN)' })
  @ApiBody({ type: PaymentCreateDto })
  create(@Body() dto: PaymentCreateDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payment logs (ADMIN)' })
  @ApiQuery({ name: 'method', required: false, enum: ['CLICK', 'PAYME', 'CARD'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'minAmount', required: false })
  @ApiQuery({ name: 'maxAmount', required: false })
  list(@Query() query: PaymentFiltersDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by id (ADMIN)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment log (ADMIN)' })
  @ApiBody({ type: PaymentUpdateDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: PaymentUpdateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment log (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
