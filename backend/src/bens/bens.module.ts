import { Module } from '@nestjs/common';
import { BensController } from './bens.controller';
import { FiltrosController } from './filtros.controller';
import { BensService } from './bens.service';

@Module({
  controllers: [BensController, FiltrosController],
  providers: [BensService],
  exports: [BensService],
})
export class BensModule {}
