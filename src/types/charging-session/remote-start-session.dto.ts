import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class RemoteStartSessionDto {
    @ApiProperty({
        example: 1,
        description: 'ID of the connector to charge on',
    })
    @Type(() => Number)
    @IsInt()
    connectorId: number;

    @ApiPropertyOptional({
        example: 3,
        description: 'ID of the user car being charged (optional, for tracking purposes)',
    })
    @Type(() => Number)
    @IsInt()
    userCarId?: number;
}
