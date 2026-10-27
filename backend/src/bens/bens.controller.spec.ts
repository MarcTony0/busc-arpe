import { Test, TestingModule } from '@nestjs/testing';
import { BensController } from './bens.controller';
import { FiltrosController } from './filtros.controller';
import { BensService } from './bens.service';

describe('BensController & FiltrosController', () => {
  let bensController: BensController;
  let filtrosController: FiltrosController;
  let bensService: {
    listarBens: jest.Mock;
    obterPorId: jest.Mock;
    obterFiltros: jest.Mock;
  };

  beforeEach(async () => {
    bensService = {
      listarBens: jest.fn(),
      obterPorId: jest.fn(),
      obterFiltros: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BensController, FiltrosController],
      providers: [
        {
          provide: BensService,
          useValue: bensService,
        },
      ],
    }).compile();

    bensController = module.get<BensController>(BensController);
    filtrosController = module.get<FiltrosController>(FiltrosController);
  });

  describe('GET /bens', () => {
    it('deve repassar a query para bensService.listarBens', async () => {
      const mockResult = [{ id: 1, nome: 'Estação 1' }];
      bensService.listarBens.mockResolvedValue(mockResult);

      const query = { sistema: 'SAA', q: 'Recife' };
      const resultado = await bensController.listarBens(query);

      expect(bensService.listarBens).toHaveBeenCalledWith(query);
      expect(resultado).toBe(mockResult);
    });
  });

  describe('GET /bens/:id', () => {
    it('deve repassar o id numérico para bensService.obterPorId', async () => {
      const mockBem = { id: 5, nome: 'Reservatório Central' };
      bensService.obterPorId.mockResolvedValue(mockBem);

      const resultado = await bensController.obterPorId(5);

      expect(bensService.obterPorId).toHaveBeenCalledWith(5);
      expect(resultado).toBe(mockBem);
    });
  });

  describe('GET /filtros', () => {
    it('deve chamar bensService.obterFiltros', async () => {
      const mockFiltros = {
        mraes: ['MRAE-I'],
        geres: ['I'],
        municipios: [],
        sistemas: ['SAA', 'SES'],
        categorias: ['ETA'],
        situacoes: ['OPERANDO'],
      };
      bensService.obterFiltros.mockResolvedValue(mockFiltros);

      const resultado = await filtrosController.obterFiltros();

      expect(bensService.obterFiltros).toHaveBeenCalled();
      expect(resultado).toBe(mockFiltros);
    });
  });
});
