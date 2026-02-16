import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConnectorService } from './connector.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateConnectorDto } from '@/types/connector/create-connector.dto';
import { UpdateConnectorDto } from '@/types/connector/update-connector.dto';
import { FilterConnectorDto } from '@/types/connector/filter-connector.dto';

@ApiTags('Connector')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('connectors')
export class ConnectorController {
  constructor(private readonly service: ConnectorService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create connector (ADMIN)' })
  @ApiBody({ type: CreateConnectorDto })
  create(@Body() dto: CreateConnectorDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List connectors' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc' })
  @ApiQuery({ name: 'stationId', required: false, example: 1 })
  @ApiQuery({ name: 'status', required: false, enum: ['AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE'] })
  findAll(@Query() query: FilterConnectorDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get connector by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update connector (ADMIN)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConnectorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete connector (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
