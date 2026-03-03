import { Module } from '@nestjs/common';
import { ConnectorTypeService } from './connector-type.service';
import { ConnectorTypeController } from './connector-type.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ConnectorTypeController],
    providers: [ConnectorTypeService],
    exports: [ConnectorTypeService],
})
export class ConnectorTypeModule { }
