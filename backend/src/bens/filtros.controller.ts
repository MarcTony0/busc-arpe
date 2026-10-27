import { Controller, Get, UseGuards } from '@nestjs/common';
import { BensService } from './bens.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('filtros')
@UseGuards(JwtAuthGuard)
export class FiltrosController {
  constructor(private readonly bensService: BensService) {}

  @Get()
  async obterFiltros() {
    return this.bensService.obterFiltros();
  }
}
