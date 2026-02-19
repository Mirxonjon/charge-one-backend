import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { StationPowerType } from '@prisma/client';

export class CreateChargingStationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  operatorId: number;

  @ApiProperty({ example: 'Main Street Station' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 40.7128 })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @Type(() => Number)
  @IsNumber()
  longitude: number;

  @ApiProperty({ enum: StationPowerType, example: StationPowerType.AC })
  @IsEnum(StationPowerType)
  powerType: StationPowerType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '24/7' })
  @IsOptional()
  @IsString()
  workingHours?: string;
}
