import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { BensService } from './bens.service';
import { ListarBensQueryDto } from './dto/listar-bens-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bens')
@UseGuards(JwtAuthGuard)
export class BensController {
  constructor(private readonly bensService: BensService) {}

  @Get()
  async listarBens(@Query() query: ListarBensQueryDto) {
    return this.bensService.listarBens(query);
  }

  @Get(':id')
  async obterPorId(@Param('id', ParseIntPipe) id: number) {
    return this.bensService.obterPorId(id);
  }
}
