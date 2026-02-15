import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { ConnectorStatusLogService } from './connector-status-log.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateConnectorStatusLogDto } from '@/types/connector-status-log/create-connector-status-log.dto';
import { FilterConnectorStatusLogDto } from '@/types/connector-status-log/filter-connector-status-log.dto';
@ApiTags('ConnectorStatusLog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('connector-status-logs')
export class ConnectorStatusLogController {
  constructor(private readonly service: ConnectorStatusLogService) {}
  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create connector status log (ADMIN)' })
  @ApiBody({ type: CreateConnectorStatusLogDto })
  create(@Body() dto: CreateConnectorStatusLogDto) {
    return this.service.create(dto);
  }
  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List connector status logs (ADMIN)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'connectorId', required: false, example: 1 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE'],
  })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  findAll(@Query() query: FilterConnectorStatusLogDto) {
    return this.service.findAll(query);
  }
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete connector status log (ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
