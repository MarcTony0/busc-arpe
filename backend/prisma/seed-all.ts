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
import XLSX = require('xlsx');

const PASTA_DATA_2 = path.resolve(__dirname, '../../data-2');
const PASTA_DATA = path.join(__dirname, 'data');

async function carregarCodigosPaisDestaqueVita(arquivoDestaque: string): Promise<Set<string>> {
  const wb = XLSX.readFile(arquivoDestaque);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
  const codigos = new Set<string>();
  for (const r of rows) {
    const cod = String(r.CODIGO_UNICO_INSTALACAO || '').trim();
    if (cod) codigos.add(cod);
  }
  return codigos;
}

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

    // 3. Processa VITA (usando os 398 pais consolidados do CSAN Destaque)
    const arquivoDestaqueVita = path.join(PASTA_DATA_2, 'vita', 'INVENTARIO_DE_BENS_REVERSIVEIS_REVISADO_CSAN_DESTAQUE.xlsx');
    const arquivoVita = path.join(PASTA_DATA_2, 'vita', 'BENS_REVERSIVEIS_VITA_SERTAO_MRAE_I_2026_09.xlsx');
    const arquivoAqua = path.join(PASTA_DATA_2, 'aqua', 'BENS_REVERSIVEIS_AQUA_RMR_PAJEU_2026_09.xlsx');

    console.log('----------------------------------------------------------------');
    console.log('📦 Carregando códigos oficiais dos 398 Bens Pais da VITA...');
    console.log(`📄 Arquivo: ${path.basename(arquivoDestaqueVita)}`);
    console.log('----------------------------------------------------------------');
    await access(arquivoDestaqueVita);
    const codigosPaisOficiaisVita = await carregarCodigosPaisDestaqueVita(arquivoDestaqueVita);
    console.log(`✅ ${codigosPaisOficiaisVita.size} instalações oficiais validadas pelo CSAN Destaque.\n`);

    console.log('----------------------------------------------------------------');
    console.log('📦 Processando: Concessão VITA (Sertão e MRAE-I)');
    console.log(`📄 Arquivo: ${path.basename(arquivoVita)}`);
    console.log('----------------------------------------------------------------');
    await access(arquivoVita);
    await executarComandoSeedBens(arquivoVita, prisma, {
      info: (msg) => console.log(`[INFO] ${msg}`),
      warn: (msg) => console.warn(`[AVISO] ${msg}`),
    }, {
      concessionaria: 'VITA',
      filtroCodigosInstalacao: codigosPaisOficiaisVita,
    });
    console.log('');

    // 4. Processa AQUA
    console.log('----------------------------------------------------------------');
    console.log('📦 Processando: Concessão AQUA (RMR e Pajeú)');
    console.log(`📄 Arquivo: ${path.basename(arquivoAqua)}`);
    console.log('----------------------------------------------------------------');
    await access(arquivoAqua);
    await executarComandoSeedBens(arquivoAqua, prisma, {
      info: (msg) => console.log(`[INFO] ${msg}`),
      warn: (msg) => console.warn(`[AVISO] ${msg}`),
    }, {
      concessionaria: 'AQUA',
    });
    console.log('');

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
