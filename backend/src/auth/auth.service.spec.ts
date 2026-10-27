import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: {
    usuario: {
      findUnique: jest.Mock;
    };
  };

  const senhaPura = 'senhaSegura123';
  const senhaHash = bcrypt.hashSync(senhaPura, 10);

  const mockUsuario = {
    id: 1,
    nome: 'Carlos Fiscal',
    email: 'carlos@arpe.pe.gov.br',
    senha_hash: senhaHash,
    perfil: 'USUARIO_COMUM',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      usuario: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('deve autenticar com sucesso e retornar token JWT e dados do usuário', async () => {
      prismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      const resultado = await service.login({
        email: 'carlos@arpe.pe.gov.br',
        senha: senhaPura,
      });

      expect(prismaService.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'carlos@arpe.pe.gov.br' },
      });
      expect(resultado).toHaveProperty('token');
      expect(resultado.usuario).toEqual({
        id: 1,
        nome: 'Carlos Fiscal',
        email: 'carlos@arpe.pe.gov.br',
        perfil: 'USUARIO_COMUM',
      });

      // Valida se o token emitido é válido e contém os dados esperados
      const decoded = jwt.decode(resultado.token) as any;
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('carlos@arpe.pe.gov.br');
      expect(decoded.perfil).toBe('USUARIO_COMUM');
    });

    it('deve lançar UnauthorizedException com mensagem genérica se o e-mail não existir', async () => {
      prismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'inexistente@arpe.pe.gov.br',
          senha: 'qualquer_senha',
        }),
      ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));
    });

    it('deve lançar UnauthorizedException com mensagem genérica se a senha estiver incorreta', async () => {
      prismaService.usuario.findUnique.mockResolvedValue(mockUsuario);

      await expect(
        service.login({
          email: 'carlos@arpe.pe.gov.br',
          senha: 'senha_errada',
        }),
      ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));
    });

    it('deve lançar UnauthorizedException se e-mail ou senha forem vazios', async () => {
      await expect(
        service.login({
          email: '',
          senha: 'senha',
        }),
      ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));

      await expect(
        service.login({
          email: 'user@arpe.pe.gov.br',
          senha: '',
        }),
      ).rejects.toThrow(new UnauthorizedException('E-mail ou senha inválidos'));
    });
  });

  describe('obterUsuarioPorId', () => {
    it('deve retornar os dados cadastrais do usuário autenticado', async () => {
      const retornoSelect = {
        id: 1,
        nome: 'Carlos Fiscal',
        email: 'carlos@arpe.pe.gov.br',
        perfil: 'USUARIO_COMUM',
        createdAt: new Date(),
      };
      prismaService.usuario.findUnique.mockResolvedValue(retornoSelect);

      const usuario = await service.obterUsuarioPorId(1);
      expect(usuario).toEqual(retornoSelect);
      expect(prismaService.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
          createdAt: true,
        },
      });
    });

    it('deve lançar UnauthorizedException se o usuário não for encontrado', async () => {
      prismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(service.obterUsuarioPorId(999)).rejects.toThrow(
        new UnauthorizedException('Usuário não encontrado'),
      );
    });
  });
});
