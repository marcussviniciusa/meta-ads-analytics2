#!/usr/bin/env node
require('dotenv').config({ path: '../../../.env' });
const { runMigration } = require('./runMigration');

// Script de migração para ser executado via linha de comando
async function main() {
  try {
    // Executar a migração para adicionar tabelas de empresa e papéis
    await runMigration('05_add_role_and_company_tables.sql');
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  }
}

// Executar script
main();
