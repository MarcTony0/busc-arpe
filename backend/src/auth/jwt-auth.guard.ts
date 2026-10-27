import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
  sub: number;
  email: string;
  nome: string;
  perfil: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(@Optional() private readonly reflector?: Reflector) {
    this.jwtSecret = process.env.JWT_SECRET || 'buscarpe-super-secret-key-2026';
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true;
      }
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extrairToken(request);

    if (!token) {
      throw new UnauthorizedException('Acesso não autorizado. Sessão ausente ou expirada.');
    }

    try {
      const payload = jwt.verify(token, this.jwtSecret) as unknown as JwtPayload;
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado.');
    }
  }

  private extrairToken(request: any): string | null {
    // 1. Prioridade: Cookie HTTPOnly 'auth_token'
    if (request?.cookies && request.cookies['auth_token']) {
      return request.cookies['auth_token'];
    }

    // 2. Fallback: Header Authorization Bearer
    const authHeader = request?.headers?.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    return null;
  }
}
