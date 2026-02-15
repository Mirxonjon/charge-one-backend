import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateStationPricingDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() stationId: number;
  @ApiProperty({ example: 0.25 })
  @Type(() => Number)
  @IsNumber()
  pricePerKwh: number;
  @ApiPropertyOptional({ example: 0.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  idleFee?: number;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  endTime?: string;
}
