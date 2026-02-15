import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorStatus } from '@prisma/client';

export class CreateConnectorDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  stationId: number;

  @ApiProperty({ example: 'CCS2' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsNumber()
  powerKw: number;

  @ApiPropertyOptional({ enum: ConnectorStatus, default: ConnectorStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(ConnectorStatus)
  status?: ConnectorStatus;

  @ApiPropertyOptional({ example: 0.25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pricePerKwh?: number;
}
