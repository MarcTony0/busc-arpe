import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: {
    getAllAndOverride: jest.Mock;
  };

  const secret = 'buscarpe-super-secret-key-2026';
  const validToken = jwt.sign(
    { sub: 10, email: 'teste@arpe.pe.gov.br', nome: 'Teste', perfil: 'USUARIO_COMUM' },
    secret,
    { expiresIn: '1h' },
  );

  const criarContextoHttp = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('deve liberar acesso sem validar token caso a rota seja marcada com @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = criarContextoHttp({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('deve liberar acesso e anexar req.user quando houver cookie auth_token válido', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const req: any = {
      cookies: {
        auth_token: validToken,
      },
    };
    const context = criarContextoHttp(req);

    const resultado = guard.canActivate(context);

    expect(resultado).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe(10);
    expect(req.user.email).toBe('teste@arpe.pe.gov.br');
  });

  it('deve liberar acesso e anexar req.user quando houver Bearer token no cabeçalho Authorization', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const req: any = {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    };
    const context = criarContextoHttp(req);

    const resultado = guard.canActivate(context);

    expect(resultado).toBe(true);
    expect(req.user.sub).toBe(10);
  });

  it('deve lançar UnauthorizedException quando nenhum token for fornecido', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const req: any = {
      cookies: {},
      headers: {},
    };
    const context = criarContextoHttp(req);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Acesso não autorizado. Sessão ausente ou expirada.'),
    );
  });

  it('deve lançar UnauthorizedException quando o token for inválido', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const req: any = {
      cookies: {
        auth_token: 'token.invalido.assinatura',
      },
    };
    const context = criarContextoHttp(req);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Token de autenticação inválido ou expirado.'),
    );
  });
});
