import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decodifica o payload do JWT sem necessidade de bibliotecas pesadas no Edge Runtime.
 */
function decodificarJwtPayload(token: string): { perfil?: string; sub?: number } | null {
  try {
    const partes = token.split('.');
    if (partes.length < 2) return null;
    const base64Url = partes[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  const isRotaLogin = pathname === '/login';
  const isRotaAdmin = pathname.startsWith('/admin');
  const isRotaProtegida = pathname === '/' || pathname.startsWith('/mapa') || isRotaAdmin;

  // 1. Se o usuário já estiver autenticado e tentar acessar a tela de login, redireciona para o mapa
  if (isRotaLogin && token) {
    const payload = decodificarJwtPayload(token);
    if (payload) {
      return NextResponse.redirect(new URL('/mapa', request.url));
    }
  }

  // 2. Bloqueio de Usuário Anônimo (HU-10 CA-01)
  // Qualquer tentativa de acesso anônimo a rotas protegidas redireciona imediatamente para /login
  if (isRotaProtegida && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Validação de Token e Bloqueio de Acesso a Rotas Administrativas (HU-10 CA-02)
  if (token) {
    const payload = decodificarJwtPayload(token);

    // Se o token for inválido ou malformado, redireciona para login e limpa o cookie
    if (!payload && isRotaProtegida) {
      const resposta = NextResponse.redirect(new URL('/login', request.url));
      resposta.cookies.delete('auth_token');
      return resposta;
    }

    // Se o usuário for USUARIO_COMUM e tentar acessar rota administrativa (/admin), redireciona para o mapa
    if (isRotaAdmin && payload?.perfil === 'USUARIO_COMUM') {
      return NextResponse.redirect(new URL('/mapa', request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Aplica o middleware nas rotas de páginas internas, protegendo /mapa, /admin e a raiz /
 * Ignora requisições de assets estáticos (_next, imagens, favicon, etc.)
 */
export const config = {
  matcher: [
    '/',
    '/login',
    '/mapa/:path*',
    '/admin/:path*',
  ],
};
