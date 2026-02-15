import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnectorStatus } from '@prisma/client';
export class CreateConnectorStatusLogDto {
  @ApiProperty({ example: 1 }) @Type(() => Number) @IsInt() connectorId: number;
  @ApiProperty({ enum: ConnectorStatus })
  @IsEnum(ConnectorStatus)
  status: ConnectorStatus;
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  powerKw?: number;
}
