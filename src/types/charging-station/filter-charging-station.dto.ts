import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorStatus, StationPowerType } from '@prisma/client';

export enum ChargingSpeed {
  STANDARD = 'STANDARD', // 7-44
  SEMI_FAST = 'SEMI_FAST', // 60-80
  FAST = 'FAST', // 120-180
  ULTRA = 'ULTRA', // >200
}

export class FilterChargingStationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  priceSort?: 'asc' | 'desc';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  operatorId?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -74.006 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ enum: StationPowerType, example: StationPowerType.DC })
  @IsOptional()
  @IsEnum(StationPowerType)
  powerType?: StationPowerType;

  @ApiPropertyOptional({ example: 'GBT_A' })
  @IsOptional()
  @IsString()
  connectorType?: string;

  @ApiPropertyOptional({ enum: ConnectorStatus })
  @IsOptional()
  @IsEnum(ConnectorStatus)
  connectorStatus?: ConnectorStatus;

  @ApiPropertyOptional({ enum: ChargingSpeed })
  @IsOptional()
  @IsEnum(ChargingSpeed)
  chargingSpeed?: ChargingSpeed;

  @ApiPropertyOptional({ example: 'Downtown Station' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;
}
