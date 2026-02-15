import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '@/types/global/dto/list-query.dto';
import { IsOptional, IsString } from 'class-validator';

export class ListWalletsDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'UZS' })
  @IsOptional()
  @IsString()
  currency?: string;
}
