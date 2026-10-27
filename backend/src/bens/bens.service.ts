import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListarBensQueryDto } from './dto/listar-bens-query.dto';
import { normalizarTexto } from '../common/utils/normalizar-texto';

export interface FiltrosResponseDto {
  mraes: string[];
  geres: string[];
  municipios: Array<{ id: number; nome: string; geres: string; mrae: string }>;
  sistemas: string[];
  categorias: string[];
  situacoes: string[];
}

@Injectable()
export class BensService {
  constructor(private readonly prisma: PrismaService) {}

  async obterFiltros(): Promise<FiltrosResponseDto> {
    const municipios = await this.prisma.municipio.findMany({
      select: { id: true, nome: true, geres: true, mrae: true },
      orderBy: { nome: 'asc' },
    });

    const mraes = Array.from(new Set(municipios.map((m) => m.mrae))).sort();
    const geres = Array.from(new Set(municipios.map((m) => m.geres))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { numeric: true }),
    );

    const categoriasRaw = await this.prisma.bem.findMany({
      where: { is_pai: true },
      select: { categoria: true },
      distinct: ['categoria'],
      orderBy: { categoria: 'asc' },
    });

    const categorias = categoriasRaw.map((c) => c.categoria).filter(Boolean);

    return {
      mraes,
      geres,
      municipios,
      sistemas: ['SAA', 'SES'],
      categorias,
      situacoes: ['OPERANDO', 'INOPERANTE', 'NAO_INFORMADO'],
    };
  }

  async listarBens(query: ListarBensQueryDto) {
    const where: any = {
      is_pai: true,
    };

    const municipioWhere: any = {};
    if (query.mrae) {
      municipioWhere.mrae = query.mrae;
    }
    if (query.geres) {
      municipioWhere.geres = query.geres;
    }
    if (query.municipio) {
      const parsedId = Number(query.municipio);
      if (!Number.isNaN(parsedId)) {
        where.municipio_id = parsedId;
      } else {
        municipioWhere.nome = {
          equals: query.municipio,
          mode: 'insensitive',
        };
      }
    }

    if (Object.keys(municipioWhere).length > 0) {
      where.municipio = municipioWhere;
    }

    if (query.sistema) {
      where.tipo_sistema = query.sistema;
    }

    if (query.categoria) {
      where.categoria = query.categoria;
    }

    if (query.situacao) {
      where.situacao = query.situacao;
    }

    if (query.q && query.q.trim().length > 0) {
      const termoNormalizado = normalizarTexto(query.q);
      where.busca_texto = {
        contains: termoNormalizado,
        mode: 'insensitive',
      };
    }

    return this.prisma.bem.findMany({
      where,
      select: {
        id: true,
        codigo_unico: true,
        nome: true,
        latitude: true,
        longitude: true,
        tipo_sistema: true,
        situacao: true,
        categoria: true,
        municipio: {
          select: {
            id: true,
            nome: true,
            geres: true,
            mrae: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async obterPorId(id: number) {
    const bem = await this.prisma.bem.findUnique({
      where: { id },
      include: {
        municipio: {
          select: {
            id: true,
            nome: true,
            geres: true,
            mrae: true,
          },
        },
        filhos: {
          select: {
            id: true,
            codigo_unico: true,
            nome: true,
            situacao: true,
            categoria: true,
            dados_complementares: true,
          },
          orderBy: {
            nome: 'asc',
          },
        },
        documentos: {
          select: {
            id: true,
            nome: true,
            url: true,
            tipo: true,
          },
          orderBy: {
            nome: 'asc',
          },
        },
      },
    });

    if (!bem) {
      throw new NotFoundException(`Bem com ID ${id} não encontrado`);
    }

    return bem;
  }
}
