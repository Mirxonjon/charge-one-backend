import { Module } from '@nestjs/common';
import { ConnectorService } from './connector.service';
import { ConnectorController } from './connector.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ConnectorService],
  controllers: [ConnectorController],
})
export class ConnectorModule {}
