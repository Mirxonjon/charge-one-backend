import { PartialType } from '@nestjs/swagger';
import { CreateConnectorTypeDto } from './create-connector-type.dto';

export class UpdateConnectorTypeDto extends PartialType(CreateConnectorTypeDto) { }
