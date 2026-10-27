import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, JwtPayload } from './jwt-auth.guard';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, usuario } = await this.authService.login(loginDto);

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
      path: '/',
    });

    return {
      mensagem: 'Login realizado com sucesso',
      usuario,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('auth_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
    });

    return {
      sucesso: true,
      mensagem: 'Logout realizado com sucesso',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async obterPerfil(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.obterUsuarioPorId(req.user.sub);
  }
}
