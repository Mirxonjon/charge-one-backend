import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChargingStationService } from './charging-station.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateChargingStationDto } from '@/types/charging-station/create-charging-station.dto';
import { UpdateChargingStationDto } from '@/types/charging-station/update-charging-station.dto';
import { FilterChargingStationDto } from '@/types/charging-station/filter-charging-station.dto';

@ApiTags('ChargingStation')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stations')
export class ChargingStationController {
  constructor(private readonly service: ChargingStationService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create charging station (ADMIN)' })
  @ApiBody({ type: CreateChargingStationDto })
  create(@Body() dto: CreateChargingStationDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List charging stations' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc' })
  @ApiQuery({ name: 'operatorId', required: false, example: 1 })
  @ApiQuery({ name: 'isActive', required: false, example: true })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  @ApiQuery({ name: 'lat', required: false, example: 40.7128 })
  @ApiQuery({ name: 'lng', required: false, example: -74.006 })
  @ApiQuery({ name: 'radiusKm', required: false, example: 5 })
  @ApiQuery({
    name: 'powerType',
    required: false,
    enum: ['AC', 'DC', 'HYBRID', 'ULTRA'],
  })
  findAll( @Query() query: FilterChargingStationDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get charging station by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update charging station (ADMIN)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChargingStationDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete charging station (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
