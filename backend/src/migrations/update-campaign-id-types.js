#!/usr/bin/env node
require('dotenv').config({ path: '../../../.env' });
const { runMigration } = require('./runMigration');

// Script de migração para atualizar os tipos de dados das colunas campaign_id e campaign_db_id
async function updateCampaignIdTypes() {
  try {
    // Executar a migração para atualizar os tipos de dados
    await runMigration('08_update_campaign_id_types.sql');
    console.log('Migração para atualizar tipos de dados de campaign_id e campaign_db_id concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração para atualizar tipos de dados:', error);
    process.exit(1);
  }
}

// Executar a migração
if (require.main === module) {
  updateCampaignIdTypes().then(() => {
    console.log('Processo de migração concluído.');
    process.exit(0);
  }).catch(err => {
    console.error('Erro durante a migração:', err);
    process.exit(1);
  });
} else {
  module.exports = { updateCampaignIdTypes };
}
