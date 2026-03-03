import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateConnectorTypeDto {
  @ApiProperty({
    description: 'Unique name of the connector type',
    example: 'CCS2',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Picture URL of the connector type',
    example: 'https://example.com/images/ccs2.png',
  })
  @IsString()
  @IsOptional()
  picture?: string;
}
