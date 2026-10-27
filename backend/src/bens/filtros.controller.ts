import { Controller, Get } from '@nestjs/common';
import { BensService } from './bens.service';

@Controller('filtros')
export class FiltrosController {
  constructor(private readonly bensService: BensService) {}

  @Get()
  async obterFiltros() {
    return this.bensService.obterFiltros();
  }
}
