import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { BensService } from './bens.service';
import { ListarBensQueryDto } from './dto/listar-bens-query.dto';

@Controller('bens')
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
