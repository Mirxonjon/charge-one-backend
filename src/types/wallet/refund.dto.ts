import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class WalletRefundDto {
  @ApiProperty({ example: 1, description: 'Target userId to refund to' })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  userId: number;

  @ApiProperty({ example: '50000.00', description: 'Refund amount as string' })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'number' ? value.toString() : value))
  amount: string;

  @ApiPropertyOptional({ example: 123, description: 'Optional related ChargingSession id' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  sessionId?: number;
}
