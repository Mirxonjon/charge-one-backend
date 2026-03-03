import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectorTypeResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'CCS2' })
    name: string;

    @ApiPropertyOptional({ example: 'https://example.com/images/ccs2.png', nullable: true })
    picture: string | null;

    @ApiProperty({ example: '2024-03-03T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-03-03T12:00:00.000Z' })
    updatedAt: Date;
}
