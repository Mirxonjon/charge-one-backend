import { Module } from '@nestjs/common';
import { ConnectorStatusLogService } from './connector-status-log.service';
import { ConnectorStatusLogController } from './connector-status-log.controller';
import { PrismaModule } from '@/modules/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  providers: [ConnectorStatusLogService],
  controllers: [ConnectorStatusLogController],
})
export class ConnectorStatusLogModule {}
