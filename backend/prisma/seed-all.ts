import 'dotenv/config';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { executarComandoSeedBens } from './seed-bens/comando-seed';
import * as fs from 'fs';
import { normalizarTexto } from './normalizar-texto';
import { seedUsuarios } from './seed-usuarios';

const PASTA_DATA = path.join(__dirname, 'data');

const PLANILHAS_CONCESSOES = [
  {
    nome: 'Concessão AQUA (RMR e Pajeú)',
    arquivo: path.join(
      PASTA_DATA,
      'BENS_REVERSIVEIS_AQUA_RMR-PAJEU_2026-09.xlsx',
    ),
  },
  {
    nome: 'Concessão VITA (Sertão e MRAE-I)',
    arquivo: path.join(
      PASTA_DATA,
      'BENS_REVERSIVEIS_VITA_SERTAO_MRAE-I_2026-09.xlsx',
    ),
  },
];

async function garantirMunicipios(prisma: PrismaClient): Promise<void> {
  const total = await prisma.municipio.count();
  if (total === 185) {
    console.log('✅ Domínio de Municípios já verificado: 185 municípios presentes no PostgreSQL.\n');
    return;
  }

  console.log(`⚠️ Municípios no banco: ${total}. Carregando os 185 municípios de Pernambuco...`);
  const csvPath = path.join(PASTA_DATA, 'municipios.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(1);

  for (const line of lines) {
    const [nome, geres, mrae] = line.split(',').map((item) => item.trim());
    if (!nome || !geres || !mrae) continue;

    await prisma.municipio.upsert({
      where: { nome },
      update: { geres, mrae, nome_normalizado: normalizarTexto(nome) },
      create: { nome, geres, mrae, nome_normalizado: normalizarTexto(nome) },
    });
  }

  const conferido = await prisma.municipio.count();
  console.log(`🎯 Carga de municípios concluída: ${conferido} municípios no banco.\n`);
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não configurada em backend/.env.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('================================================================');
  console.log('🚀 INICIANDO SEED COMPLETO E UNIFICADO DO buscARPE (Card 1.3)');
  console.log('================================================================\n');

  try {
    // 1. Garante os 185 municípios
    await garantirMunicipios(prisma);

    // 2. Garante os usuários padrão do sistema
    await seedUsuarios(prisma);

    // 3. Processa cada concessão
    for (const concessao of PLANILHAS_CONCESSOES) {
      console.log('----------------------------------------------------------------');
      console.log(`📦 Processando: ${concessao.nome}`);
      console.log(`📄 Arquivo: ${path.basename(concessao.arquivo)}`);
      console.log('----------------------------------------------------------------');

      await access(concessao.arquivo);

      await executarComandoSeedBens(concessao.arquivo, prisma, {
        info: (msg) => console.log(`[INFO] ${msg}`),
        warn: (msg) => console.warn(`[AVISO] ${msg}`),
      });

      console.log('');
    }

    // 3. Resumo consolidado do banco de dados
    const totalPais = await prisma.bem.count({ where: { is_pai: true } });
    const totalFilhos = await prisma.bem.count({ where: { is_pai: false } });
    const totalGeral = await prisma.bem.count();

    console.log('================================================================');
    console.log('🎉 SEED UNIFICADO CONCLUÍDO COM SUCESSO NO PostgreSQL!');
    console.log('================================================================');
    console.log(`🏛️ Total de Bens Pais (Instalações no Mapa): ${totalPais}`);
    console.log(`⚙️ Total de Bens Filhos (Equipamentos Detalhados): ${totalFilhos}`);
    console.log(`📊 Total Geral de Bens no Banco: ${totalGeral}`);
    console.log('================================================================\n');
  } finally {
    try {
      await prisma.$disconnect();
    } finally {
      await pool.end();
    }
  }
}

main().catch((erro: unknown) => {
  console.error('❌ Falha ao executar seed unificado:', erro);
  process.exitCode = 1;
});
