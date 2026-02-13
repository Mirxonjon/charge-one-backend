import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from '@/types/auth/register.dto';
import { VerifyOtpDto } from '@/types/auth/verify-otp.dto';
import { LoginWithOtpDto, LoginWithPasswordDto } from '@/types/auth/login.dto';
import { RefreshDto } from '@/types/auth/refresh.dto';
import { ForgotPasswordDto } from '@/types/auth/forgot-password.dto';
import { ResetPasswordDto } from '@/types/auth/reset-password.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register by phone - send OTP' })
  @ApiBody({ type: RegisterDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and complete registration/login' })
  @ApiBody({ type: VerifyOtpDto })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyOtp(dto, { ip, userAgent: userAgent as string });
  }

  @Public()
  @Post('login/otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using phone + OTP' })
  @ApiBody({ type: LoginWithOtpDto })
  loginWithOtp(@Body() dto: LoginWithOtpDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithOtp(dto, { ip, userAgent: userAgent as string });
  }

  @Public()
  @Post('login/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using phone + password' })
  @ApiBody({ type: LoginWithPasswordDto })
  loginWithPassword(@Body() dto: LoginWithPasswordDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithPassword(dto, { ip, userAgent: userAgent as string });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshDto })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(dto.refreshToken, { ip, userAgent: userAgent as string });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token (all sessions for current device)' })
  logout(@Req() req: any) {
    const userId = req.user.sub;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    return this.authService.logout(userId, { ip, userAgent: userAgent as string });
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for password reset' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and reset password' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin-only example route' })
  adminOnly() {
    return { message: 'You are admin' };
  }
}
