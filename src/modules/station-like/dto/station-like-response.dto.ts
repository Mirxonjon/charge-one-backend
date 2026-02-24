import { ApiProperty } from '@nestjs/swagger';

class StationSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Downtown Station' })
  title!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 41.2995 })
  latitude!: number;

  @ApiProperty({ example: 69.2401 })
  longitude!: number;
}

export class StationLikeItemDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 2 })
  userId!: number;

  @ApiProperty({ example: 5 })
  stationId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: StationSummaryDto })
  station!: StationSummaryDto;
}

export class StationLikeListResponseDto {
  @ApiProperty({ type: [StationLikeItemDto] })
  items!: StationLikeItemDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;
}

export class CountResponseDto {
  @ApiProperty({ example: 123 })
  count!: number;
}

export class CheckResponseDto {
  @ApiProperty({ example: true })
  liked!: boolean;
}
