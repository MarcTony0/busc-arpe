import { Test, TestingModule } from '@nestjs/testing';
import { BensService } from './bens.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('BensService', () => {
  let service: BensService;
  let prisma: {
    municipio: { findMany: jest.Mock };
    bem: { findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      municipio: {
        findMany: jest.fn(),
      },
      bem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BensService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BensService>(BensService);
  });

  describe('obterFiltros', () => {
    it('deve retornar opções distintas e ordenadas para alimentação dos filtros em cascata', async () => {
      prisma.municipio.findMany.mockResolvedValue([
        { id: 1, nome: 'Recife', geres: 'I', mrae: 'MRAE-II' },
        { id: 2, nome: 'Olinda', geres: 'I', mrae: 'MRAE-II' },
        { id: 3, nome: 'Petrolina', geres: 'VIII', mrae: 'MRAE-I' },
      ]);

      prisma.bem.findMany.mockResolvedValue([
        { categoria: 'ESTACAO ELEVATORIA' },
        { categoria: 'RESERVATORIO' },
      ]);

      const filtros = await service.obterFiltros();

      expect(filtros.mraes).toEqual(['MRAE-I', 'MRAE-II']);
      expect(filtros.geres).toEqual(['I', 'VIII']);
      expect(filtros.municipios).toHaveLength(3);
      expect(filtros.sistemas).toEqual(['SAA', 'SES']);
      expect(filtros.categorias).toEqual(['ESTACAO ELEVATORIA', 'RESERVATORIO']);
      expect(filtros.situacoes).toEqual(['OPERANDO', 'INOPERANTE', 'NAO_INFORMADO']);
    });
  });

  describe('listarBens', () => {
    it('deve listar apenas Bens Pai (is_pai: true) com campos leves para plotagem', async () => {
      prisma.bem.findMany.mockResolvedValue([
        {
          id: 10,
          codigo_unico: 'REC-EAT-E-001',
          nome: 'EAT RECIFE 01',
          latitude: -8.05,
          longitude: -34.88,
          tipo_sistema: 'SAA',
          situacao: 'OPERANDO',
          categoria: 'ESTACAO ELEVATORIA',
          municipio: { id: 1, nome: 'Recife', geres: 'I', mrae: 'MRAE-II' },
        },
      ]);

      const resultado = await service.listarBens({});

      expect(prisma.bem.findMany).toHaveBeenCalledWith({
        where: { is_pai: true },
        select: {
          id: true,
          codigo_unico: true,
          nome: true,
          latitude: true,
          longitude: true,
          tipo_sistema: true,
          situacao: true,
          categoria: true,
          concessionaria: true,
          visivel: true,
          municipio: {
            select: {
              id: true,
              nome: true,
              geres: true,
              mrae: true,
            },
          },
        },
        orderBy: { nome: 'asc' },
      });
      expect(resultado).toHaveLength(1);
      expect(resultado[0].codigo_unico).toBe('REC-EAT-E-001');
    });

    it('deve aplicar filtros cumulativos de mrae, geres, sistema, categoria e situacao', async () => {
      prisma.bem.findMany.mockResolvedValue([]);

      await service.listarBens({
        mrae: 'MRAE-I',
        geres: 'VIII',
        sistema: 'SAA',
        categoria: 'RESERVATORIO',
        situacao: 'OPERANDO',
      });

      expect(prisma.bem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_pai: true,
            municipio: {
              mrae: 'MRAE-I',
              geres: 'VIII',
            },
            tipo_sistema: 'SAA',
            categoria: 'RESERVATORIO',
            situacao: 'OPERANDO',
          },
        }),
      );
    });

    it('deve filtrar por ID de município se for numérico, ou por nome se for texto', async () => {
      prisma.bem.findMany.mockResolvedValue([]);

      // Teste com ID numérico
      await service.listarBens({ municipio: '42' });
      expect(prisma.bem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_pai: true,
            municipio_id: 42,
          },
        }),
      );

      // Teste com nome de município
      await service.listarBens({ municipio: 'Caruaru' });
      expect(prisma.bem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_pai: true,
            municipio: {
              nome: {
                equals: 'Caruaru',
                mode: 'insensitive',
              },
            },
          },
        }),
      );
    });

    it('deve normalizar o parâmetro q e buscar por ILIKE na coluna busca_texto', async () => {
      prisma.bem.findMany.mockResolvedValue([]);

      await service.listarBens({ q: 'Estação São João' });

      expect(prisma.bem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_pai: true,
            busca_texto: {
              contains: 'estacao sao joao',
              mode: 'insensitive',
            },
          },
        }),
      );
    });
  });

  describe('obterPorId', () => {
    it('deve retornar os dados detalhados da instalação com filhos e documentos', async () => {
      const mockBem = {
        id: 10,
        codigo_unico: 'REC-EAT-E-001',
        nome: 'EAT RECIFE 01',
        municipio: { id: 1, nome: 'Recife', geres: 'I', mrae: 'MRAE-II' },
        filhos: [
          {
            id: 101,
            codigo_unico: 'BOMBA-01',
            nome: 'Conjunto Moto-Bomba 01',
            situacao: 'OPERANDO',
            categoria: 'BOMBA',
            dados_complementares: { potencia_cv: 50 },
          },
        ],
        documentos: [
          {
            id: 1,
            nome: 'Termo de Vistoria 2026.pdf',
            url: 'https://drive.google.com/doc1',
            tipo: 'PDF',
          },
        ],
      };

      prisma.bem.findUnique.mockResolvedValue(mockBem);

      const resultado = await service.obterPorId(10);

      expect(resultado).toEqual(mockBem);
      expect(prisma.bem.findUnique).toHaveBeenCalledWith({
        where: { id: 10 },
        include: {
          municipio: {
            select: { id: true, nome: true, geres: true, mrae: true },
          },
          filhos: {
            select: {
              id: true,
              codigo_unico: true,
              nome: true,
              situacao: true,
              categoria: true,
              concessionaria: true,
              visivel: true,
              dados_complementares: true,
            },
            orderBy: { nome: 'asc' },
          },
          documentos: {
            select: { id: true, nome: true, url: true, tipo: true },
            orderBy: { nome: 'asc' },
          },
        },
      });
    });

    it('deve lançar NotFoundException quando o bem não existir', async () => {
      prisma.bem.findUnique.mockResolvedValue(null);

      await expect(service.obterPorId(999)).rejects.toThrow(NotFoundException);
    });
  });
});
