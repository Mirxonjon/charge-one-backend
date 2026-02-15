import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StationPricingService } from './station-pricing.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateStationPricingDto } from '@/types/station-pricing/create-station-pricing.dto';
import { UpdateStationPricingDto } from '@/types/station-pricing/update-station-pricing.dto';
import { FilterStationPricingDto } from '@/types/station-pricing/filter-station-pricing.dto';
@ApiTags('StationPricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class StationPricingController {
  constructor(private readonly service: StationPricingService) {}
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create station pricing (ADMIN)' })
  @ApiBody({ type: CreateStationPricingDto })
  create(@Body() dto: CreateStationPricingDto) {
    return this.service.create(dto);
  }
  @Get()
  @ApiOperation({ summary: 'List station pricing (USER read-only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'stationId', required: false, example: 1 })
  findAll(@Query() query: FilterStationPricingDto) {
    return this.service.findAll(query);
  }
  @Get(':id') @ApiOperation({ summary: 'Get station pricing by id' }) findOne(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.findOne(id);
  }
  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update station pricing (ADMIN)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStationPricingDto
  ) {
    return this.service.update(id, dto);
  }
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete station pricing (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
