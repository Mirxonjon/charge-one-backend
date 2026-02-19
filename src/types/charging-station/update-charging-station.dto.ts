import { PartialType } from '@nestjs/swagger';
import { CreateChargingStationDto } from './create-charging-station.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StationPowerType } from '@prisma/client';

export class UpdateChargingStationDto extends PartialType(CreateChargingStationDto) {
  @ApiPropertyOptional({ enum: StationPowerType })
  @IsOptional()
  @IsEnum(StationPowerType)
  powerType?: StationPowerType;
}
