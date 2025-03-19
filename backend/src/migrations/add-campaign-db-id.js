#!/usr/bin/env node
require('dotenv').config({ path: '../../../.env' });
const { runMigration } = require('./runMigration');

// Script de migração para adicionar a coluna campaign_db_id à tabela campaign_insights
async function main() {
  try {
    // Executar a migração para adicionar a coluna campaign_db_id
    await runMigration('07_add_campaign_db_id_to_insights.sql');
    console.log('Migração para adicionar campaign_db_id concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migração para adicionar campaign_db_id:', error);
    process.exit(1);
  }
}

// Executar script
main();
