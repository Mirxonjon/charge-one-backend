import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min, Max, IsNumber, IsEnum } from 'class-validator';

export enum CarCreatedByTypeDto { ADMIN = 'ADMIN', USER = 'USER', SYSTEM = 'SYSTEM' }

export class CreateCarDto {
  @ApiPropertyOptional({ enum: CarCreatedByTypeDto, description: 'Creator type (ADMIN only sets ADMIN; otherwise ignored)' })
  @IsOptional()
  @IsEnum(CarCreatedByTypeDto)
  createdByType?: CarCreatedByTypeDto;

  @ApiProperty({ example: 'Tesla' })
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Model 3' })
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiPropertyOptional({ example: 2023 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  // @ApiPropertyOptional({ example: '5YJ3E1EA7JF000000' })
  // @IsOptional()
  // @IsString()
  // vin?: string;

  @ApiPropertyOptional({ example: 82.0 })
  @IsOptional()
  @IsNumber()
  batterySize?: number;

  @ApiPropertyOptional({ example: 560 })
  @IsOptional()
  @IsInt()
  rangeKm?: number;

  @ApiPropertyOptional({ example: 'https://images.example.com/cars/tesla-model-3.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
