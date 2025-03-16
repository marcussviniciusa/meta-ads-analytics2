-- Inserir fontes de integração

-- Verificar se as fontes já existem para evitar duplicação
INSERT INTO integration_sources (name, display_name, description, is_active)
SELECT 'meta_ads', 'Meta Ads', 'Integração com plataforma de anúncios do Meta (Facebook e Instagram)', true
WHERE NOT EXISTS (SELECT 1 FROM integration_sources WHERE name = 'meta_ads');

INSERT INTO integration_sources (name, display_name, description, is_active)
SELECT 'google_analytics', 'Google Analytics', 'Integração com Google Analytics para métricas de site', false
WHERE NOT EXISTS (SELECT 1 FROM integration_sources WHERE name = 'google_analytics');
