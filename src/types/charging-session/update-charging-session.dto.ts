import { PartialType } from '@nestjs/swagger';
import { CreateChargingSessionDto } from './create-charging-session.dto';
export class UpdateChargingSessionDto extends PartialType(
  CreateChargingSessionDto
) {}
