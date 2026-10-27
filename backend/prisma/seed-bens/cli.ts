import 'dotenv/config';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { executarComandoSeedBens } from './comando-seed';

async function main(): Promise<void> {
  const caminhoArquivo = process.argv[2];
  if (!caminhoArquivo) {
    throw new Error(
      'Informe o caminho do arquivo CSV ou XLSX: npm run seed:bens -- <arquivo>',
    );
  }

  const arquivo = path.resolve(caminhoArquivo);
  await access(arquivo);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL não está configurada; informe-a no ambiente ou em backend/.env.',
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await executarComandoSeedBens(arquivo, prisma, {
      info: (mensagem) => console.log(mensagem),
      warn: (mensagem) => console.warn(mensagem),
    });
  } finally {
    try {
      await prisma.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

main().catch((erro: unknown) => {
  console.error('Falha ao executar seed de bens:', erro);
  process.exitCode = 1;
});
