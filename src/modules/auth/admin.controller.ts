import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminCreateDto } from '@/types/auth/admin-create.dto';
import { AdminLoginDto } from '@/types/auth/admin-login.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create admin user (ADMIN only)' })
  @ApiBody({ type: AdminCreateDto })
  createAdmin(@Body() dto: AdminCreateDto) {
    return this.authService.createAdmin(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login with phone + password' })
  @ApiBody({ type: AdminLoginDto })
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto, { ip: req.ip, userAgent: req.headers['user-agent'] as string });
  }
}
