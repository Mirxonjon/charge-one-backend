import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class TransactionFiltersDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: '10000.00' })
  @IsOptional()
  minAmount?: string;

  @ApiPropertyOptional({ example: '500000.00' })
  @IsOptional()
  maxAmount?: string;

  @ApiPropertyOptional({ example: 'CLICK' })
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  walletId?: number;
}
