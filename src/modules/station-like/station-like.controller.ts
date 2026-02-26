import { Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StationLikeService } from './station-like.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';
import { CheckResponseDto, CountResponseDto, StationLikeListResponseDto } from './dto/station-like-response.dto';
import { ToggleLikeResponseDto } from './dto/toggle-like.dto';

@ApiTags('StationLike')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('station-likes')
export class StationLikeController {
  constructor(private readonly service: StationLikeService) {}

  @Post(':stationId/toggle')
  @ApiOperation({ summary: 'Toggle like for a station' })
  @ApiResponse({ status: 200, type: ToggleLikeResponseDto })
  async toggle(
    @Param('stationId', ParseIntPipe) stationId: number,
    @Req() req: Request
  ): Promise<ToggleLikeResponseDto> {
    const userId = (req as any).user.sub as number;
    return this.service.toggle(userId, stationId);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my liked stations with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, type: StationLikeListResponseDto })
  async my(@Req() req: Request, @Query() query: ListQueryDto): Promise<StationLikeListResponseDto> {
    const userId = (req as any).user.sub as number;
    console.log(userId);
    
    const { page = 1, limit = 10 } = query;
    return this.service.myLikes(userId, page, limit);
  }

  @Get('station/:stationId/count')
  @ApiOperation({ summary: 'Get like count for a station' })
  @ApiResponse({ status: 200, type: CountResponseDto })
  async count(@Param('stationId', ParseIntPipe) stationId: number): Promise<CountResponseDto> {
    const count = await this.service.countForStation(stationId);
    return { count };
  }

  @Get('station/:stationId/check')
  @ApiOperation({ summary: 'Check if current user liked this station' })
  @ApiResponse({ status: 200, type: CheckResponseDto })
  async check(
    @Param('stationId', ParseIntPipe) stationId: number,
    @Req() req: Request
  ): Promise<CheckResponseDto> {
    const userId = (req as any).user.sub as number;
    const liked = await this.service.checkLiked(userId, stationId);
    return { liked };
  }
}
