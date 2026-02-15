import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionStatus } from '@prisma/client';
export class CreateChargingSessionDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Only ADMIN uses this to create for a user',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() connectorId: number;
  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  energyKwh?: number;
  @ApiPropertyOptional({ example: 2.62 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cost?: number;
  @ApiPropertyOptional({ enum: SessionStatus, default: SessionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;
  @ApiPropertyOptional({ example: '2026-02-14T05:30:00.000Z' })
  @IsOptional()
  startTime?: string;
  @ApiPropertyOptional({ example: '2026-02-14T07:00:00.000Z' })
  @IsOptional()
  endTime?: string;
}
