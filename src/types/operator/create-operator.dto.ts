import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOperatorDto {
  @ApiProperty({ example: 'GreenCharge LLC' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: '+1 555-123-4567', required: false })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({ example: 'First National Bank', required: false })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: 'US1234567890', required: false })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiProperty({ example: '12345', required: false })
  @IsOptional()
  @IsString()
  bankMfo?: string;
}
