import { Module } from '@nestjs/common';
import { BensController } from './bens.controller';
import { FiltrosController } from './filtros.controller';
import { BensService } from './bens.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BensController, FiltrosController],
  providers: [BensService],
  exports: [BensService],
})
export class BensModule {}
