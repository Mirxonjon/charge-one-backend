import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class WalletDepositDto {
  @ApiProperty({ example: '100000.00', description: 'Deposit amount in minor precision-safe string' })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'number' ? value.toString() : value))
  amount: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CLICK })
  @IsOptional()
  @IsEnum(PaymentMethod)
  provider?: PaymentMethod;
}
