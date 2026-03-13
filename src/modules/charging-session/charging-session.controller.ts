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
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ChargingSessionService } from './charging-session.service';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { CreateChargingSessionDto } from '@/types/charging-session/create-charging-session.dto';
import { UpdateChargingSessionDto } from '@/types/charging-session/update-charging-session.dto';
import { FilterChargingSessionDto } from '@/types/charging-session/filter-charging-session.dto';
import { RemoteStartSessionDto } from '@/types/charging-session/remote-start-session.dto';

import { Request } from 'express';

@ApiTags('ChargingSession')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class ChargingSessionController {
  constructor(private readonly service: ChargingSessionService) { }

  // USER create own session purely locally (deprecated but kept for compatibility)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create charging session (USER creates own)' })
  @ApiBody({ type: CreateChargingSessionDto })
  create(@Body() dto: CreateChargingSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.createForUser(userId, dto);
  }

  // TRIGGER REMOTE START
  @Post('start')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger remote start on an OCPP station' })
  @ApiBody({ type: RemoteStartSessionDto })
  remoteStart(@Body() dto: RemoteStartSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.remoteStartSession(userId, dto);
  }

  // TRIGGER REMOTE STOP
  @Post('stop/:sessionId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger remote stop on an OCPP station' })
  remoteStop(@Param('sessionId', ParseIntPipe) sessionId: number, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.remoteStopSession(userId, sessionId);
  }

  // ADMIN create for any user
  @Post('admin')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create charging session (ADMIN for any user)' })
  @ApiBody({ type: CreateChargingSessionDto })
  adminCreate(@Body() dto: CreateChargingSessionDto) {
    return this.service.adminCreate(dto);
  }

  // USER list own
  @Get()
  @ApiOperation({ summary: 'List own charging sessions (USER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  findAll(@Query() query: FilterChargingSessionDto, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.findAllForUser(userId, query);
  }

  // ADMIN list all
  @Get('admin')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all charging sessions (ADMIN)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'userId', required: false, example: 1 })
  @ApiQuery({ name: 'connectorId', required: false, example: 1 })
  @ApiQuery({ name: 'from', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2024-12-31' })
  adminFindAll(@Query() query: FilterChargingSessionDto) {
    return this.service.adminFindAll(query);
  }

  // USER get own by id
  @Get(':id')
  @ApiOperation({
    summary: 'Get charging session by id (USER owns only)',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userId = (req as any).user.sub as number;
    return this.service.findOneForUser(userId, id);
  }

  // ADMIN get by id
  @Get('admin/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get charging session by id (ADMIN)' })
  adminFindOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminFindOne(id);
  }

  // ADMIN update
  @Patch('admin/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update charging session (ADMIN)' })
  adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChargingSessionDto
  ) {
    return this.service.adminUpdate(id, dto);
  }

  // ADMIN delete
  @Delete('admin/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete charging session (ADMIN)' })
  adminRemove(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminRemove(id);
  }
}
