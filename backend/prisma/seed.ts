import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Remove acentuação e converte para minúsculas
 * Ex: "São Lourenço da Mata" -> "sao lourenco da mata"
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function main() {
  console.log('Iniciando seed de Municípios de Pernambuco');

  const csvPath = path.join(__dirname, 'data', 'municipios.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo CSV não encontrado em: ${csvPath}`);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Ignora o cabeçalho (nome,geres,mrae)
  const dataLines = lines.slice(1);

  console.log(`📄 Lendo ${dataLines.length} registros do arquivo municipios.csv...`);

  let inseridosOuAtualizados = 0;

  for (const line of dataLines) {
    const [nome, geres, mrae] = line.split(',').map((item) => item.trim());

    if (!nome || !geres || !mrae) {
      console.warn(`⚠️ Linha inválida ignorada: "${line}"`);
      continue;
    }

    const nome_normalizado = normalizarTexto(nome);

    await prisma.municipio.upsert({
      where: { nome },
      update: {
        geres,
        mrae,
        nome_normalizado,
      },
      create: {
        nome,
        geres,
        mrae,
        nome_normalizado,
      },
    });

    inseridosOuAtualizados++;
  }

  // Conferência automática no banco
  const totalNoBanco = await prisma.municipio.count();

  console.log('----------------------------------------------------');
  console.log(`✅ Processados no arquivo: ${inseridosOuAtualizados}`);
  console.log(`📊 Total de municípios no PostgreSQL: ${totalNoBanco}`);
  console.log('----------------------------------------------------');

  if (totalNoBanco === 185) {
    console.log('🎯 CONFERÊNCIA APROVADA: Exatamente 185 registros presentes no banco!');
  } else {
    console.error(`❌ ATENÇÃO: Esperado 185 municípios, mas foram encontrados ${totalNoBanco}.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro durante execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
