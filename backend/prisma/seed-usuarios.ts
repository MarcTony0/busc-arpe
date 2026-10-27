import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { PerfilUsuario } from '../src/generated/prisma/enums';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedUsuarios(prismaClient: PrismaClient = prisma): Promise<void> {
  console.log('🌱 Semeando usuários do sistema buscARPE...');

  const caminhoUsuariosLocal = path.join(__dirname, 'usuarios.local.json');
  let usuariosParaInserir: Array<{
    nome: string;
    email: string;
    senha: string;
    perfil: PerfilUsuario;
  }> = [];

  if (fs.existsSync(caminhoUsuariosLocal)) {
    try {
      const conteudo = fs.readFileSync(caminhoUsuariosLocal, 'utf-8');
      usuariosParaInserir = JSON.parse(conteudo);
      console.log(`🔐 Carregando usuários a partir do arquivo privado usuarios.local.json (${usuariosParaInserir.length} usuários encontrados).`);
    } catch (err) {
      console.warn('⚠️ Falha ao ler usuarios.local.json, utilizando credenciais padrão de demonstração:', err);
    }
  }

  if (usuariosParaInserir.length === 0) {
    usuariosParaInserir = [
      {
        nome: 'Usuário Comum ARPE',
        email: 'usuario@arpe.pe.gov.br',
        senha: 'arpe2026',
        perfil: PerfilUsuario.USUARIO_COMUM,
      },
      {
        nome: 'Especialista Técnico ARPE',
        email: 'fiscal@arpe.pe.gov.br',
        senha: 'fiscal2026',
        perfil: PerfilUsuario.ESPECIALISTA_TECNICO,
      },
      {
        nome: 'Gestor Geral ARPE',
        email: 'admin@arpe.pe.gov.br',
        senha: 'admin123',
        perfil: PerfilUsuario.GESTOR,
      },
    ];
  }

  for (const u of usuariosParaInserir) {
    const senha_hash = await bcrypt.hash(u.senha, 10);

    const usuario = await prismaClient.usuario.upsert({
      where: { email: u.email },
      update: {
        nome: u.nome,
        senha_hash,
        perfil: u.perfil,
      },
      create: {
        nome: u.nome,
        email: u.email,
        senha_hash,
        perfil: u.perfil,
      },
    });

    console.log(`✅ Usuário configurado: ${usuario.email} (${usuario.perfil})`);
  }

  const totalUsuarios = await prismaClient.usuario.count();
  console.log(`👥 Total de usuários no banco de dados: ${totalUsuarios}`);
}

if (require.main === module) {
  seedUsuarios()
    .catch((err) => {
      console.error('❌ Erro no seed de usuários:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
