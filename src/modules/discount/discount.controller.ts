import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiscountService } from './discount.service';
import { CreateDiscountDto } from '@/types/discount/create-discount.dto';
import { UpdateDiscountDto } from '@/types/discount/update-discount.dto';
import { FilterDiscountDto } from '@/types/discount/filter-discount.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

@ApiTags('Discount')
@ApiBearerAuth()
@Controller('discount')
@UseGuards(JwtAuthGuard)
export class DiscountController {
  constructor(private readonly service: DiscountService) {}

  // ADMIN only
  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount (ADMIN)' })
  @ApiBody({ type: CreateDiscountDto, examples: {
    percent: { value: { stationId: 1, percent: 10, startTime: '2026-02-15T08:00:00Z', endTime: '2026-02-16T08:00:00Z' } },
    fixed: { value: { stationId: 1, connectorId: 2, fixedPrice: '1200.00', startTime: '2026-02-15T08:00:00Z', endTime: '2026-02-16T08:00:00Z' } }
  }})
  create(@Body() dto: CreateDiscountDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update discount (ADMIN)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDiscountDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete discount (ADMIN)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
    return;
  }

  // Read endpoints (USER + ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List discounts (filterable)' })
  list(@Query() q: FilterDiscountDto) {
    return this.service.list(q);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get discount by id' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }
}
