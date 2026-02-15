import { PartialType } from '@nestjs/swagger';
import { CreateStationPricingDto } from './create-station-pricing.dto';
export class UpdateStationPricingDto extends PartialType(
  CreateStationPricingDto
) {}
