import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    obterUsuarioPorId: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      obterUsuarioPorId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/login', () => {
    it('deve autenticar, definir o cookie httpOnly e retornar a resposta formatada', async () => {
      const mockLoginResponse = {
        token: 'jwt.token.mockado',
        usuario: {
          id: 1,
          nome: 'Maria Silva',
          email: 'maria@arpe.pe.gov.br',
          perfil: 'USUARIO_COMUM',
        },
      };

      authService.login.mockResolvedValue(mockLoginResponse);

      const mockRes = {
        cookie: jest.fn(),
      } as any;

      const resultado = await controller.login(
        { email: 'maria@arpe.pe.gov.br', senha: '123' },
        mockRes,
      );

      expect(authService.login).toHaveBeenCalledWith({
        email: 'maria@arpe.pe.gov.br',
        senha: '123',
      });

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'auth_token',
        'jwt.token.mockado',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );

      expect(resultado).toEqual({
        mensagem: 'Login realizado com sucesso',
        usuario: mockLoginResponse.usuario,
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('deve limpar o cookie auth_token e retornar status de sucesso', async () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as any;

      const resultado = await controller.logout(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'auth_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );

      expect(resultado).toEqual({
        sucesso: true,
        mensagem: 'Logout realizado com sucesso',
      });
    });
  });

  describe('GET /auth/me', () => {
    it('deve retornar os dados do usuário a partir do token decodificado no request', async () => {
      const mockPerfil = {
        id: 2,
        nome: 'João Santos',
        email: 'joao@arpe.pe.gov.br',
        perfil: 'GESTOR',
        createdAt: new Date(),
      };

      authService.obterUsuarioPorId.mockResolvedValue(mockPerfil);

      const mockReq = {
        user: {
          sub: 2,
          email: 'joao@arpe.pe.gov.br',
          nome: 'João Santos',
          perfil: 'GESTOR',
        },
      } as any;

      const resultado = await controller.obterPerfil(mockReq);

      expect(authService.obterUsuarioPorId).toHaveBeenCalledWith(2);
      expect(resultado).toEqual(mockPerfil);
    });
  });
});
