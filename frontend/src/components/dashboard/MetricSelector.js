import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControl,
  FormGroup,
  FormControlLabel,
  Paper,
  Button,
  Divider,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
import InfoIcon from '@mui/icons-material/Info';

// Métricas disponíveis para seleção
const AVAILABLE_METRICS = {
  meta: [
    { id: 'spend', name: 'Gastos', description: 'Total de dinheiro gasto em anúncios', default: true, category: 'finance' },
    { id: 'impressions', name: 'Impressões', description: 'Número de vezes que os anúncios foram exibidos', default: true, category: 'performance' },
    { id: 'clicks', name: 'Cliques', description: 'Número de cliques em anúncios', default: true, category: 'performance' },
    { id: 'ctr', name: 'CTR', description: 'Taxa de cliques (Cliques/Impressões)', default: true, category: 'performance' },
    { id: 'cpm', name: 'CPM', description: 'Custo por mil impressões', default: false, category: 'finance' },
    { id: 'cpc', name: 'CPC', description: 'Custo por clique', default: false, category: 'finance' },
    { id: 'reach', name: 'Alcance', description: 'Número de pessoas que viram seus anúncios', default: true, category: 'audience' },
    { id: 'frequency', name: 'Frequência', description: 'Média de vezes que cada pessoa viu seus anúncios', default: false, category: 'audience' },
    { id: 'conversions', name: 'Conversões', description: 'Número de ações completadas', default: true, category: 'conversion' },
    { id: 'costPerConversion', name: 'Custo por Conversão', description: 'Custo médio por conversão', default: false, category: 'conversion' },
    { id: 'conversionRate', name: 'Taxa de Conversão', description: 'Percentual de cliques que resultaram em conversões', default: true, category: 'conversion' }
  ],
  ga: [
    { id: 'activeUsers', name: 'Usuários Ativos', description: 'Número de usuários ativos no período', default: true, category: 'audience' },
    { id: 'sessions', name: 'Sessões', description: 'Número total de sessões no período', default: true, category: 'audience' },
    { id: 'pageViews', name: 'Visualizações de Página', description: 'Número total de páginas visualizadas', default: true, category: 'engagement' },
    { id: 'bounceRate', name: 'Taxa de Rejeição', description: 'Percentual de sessões de página única', default: false, category: 'engagement' },
    { id: 'avgSessionDuration', name: 'Duração Média da Sessão', description: 'Tempo médio de duração das sessões', default: false, category: 'engagement' },
    { id: 'newUsers', name: 'Novos Usuários', description: 'Número de usuários novos no período', default: true, category: 'audience' },
    { id: 'engagementRate', name: 'Taxa de Engajamento', description: 'Percentual de sessões engajadas', default: false, category: 'engagement' },
    { id: 'conversions', name: 'Conversões', description: 'Número total de conversões', default: true, category: 'conversion' }
  ]
};

// Categorias de métricas
const CATEGORIES = {
  finance: 'Financeiro',
  performance: 'Performance',
  audience: 'Audiência',
  engagement: 'Engajamento',
  conversion: 'Conversão'
};

/**
 * Componente para seleção de métricas no dashboard
 */
const MetricSelector = ({ platform, selectedMetrics, onMetricsChange }) => {
  // Agrupar métricas por categoria
  const metricsByCategory = {};
  
  AVAILABLE_METRICS[platform].forEach(metric => {
    if (!metricsByCategory[metric.category]) {
      metricsByCategory[metric.category] = [];
    }
    metricsByCategory[metric.category].push(metric);
  });

  // Restaurar métricas padrão
  const handleRestoreDefaults = () => {
    const defaultMetrics = AVAILABLE_METRICS[platform]
      .filter(metric => metric.default)
      .map(metric => metric.id);
    
    onMetricsChange(defaultMetrics);
  };

  // Alternar seleção de métrica
  const handleToggleMetric = (metricId) => {
    if (selectedMetrics.includes(metricId)) {
      // Remover métrica
      onMetricsChange(selectedMetrics.filter(id => id !== metricId));
    } else {
      // Adicionar métrica
      onMetricsChange([...selectedMetrics, metricId]);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Selecionar Métricas 
          {platform === 'meta' ? ' do Meta Ads' : ' do Google Analytics'}
        </Typography>
        <Tooltip title="Restaurar padrões">
          <IconButton onClick={handleRestoreDefaults} size="small">
            <RestoreIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Selecione as métricas que deseja visualizar nos gráficos e relatórios.
      </Typography>
      
      {Object.keys(metricsByCategory).map(category => (
        <Accordion key={category} defaultExpanded={category === 'performance' || category === 'audience'}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>{CATEGORIES[category]}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {metricsByCategory[category].map(metric => (
                <FormControlLabel
                  key={metric.id}
                  control={
                    <Checkbox 
                      checked={selectedMetrics.includes(metric.id)} 
                      onChange={() => handleToggleMetric(metric.id)}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {metric.name}
                      <Tooltip title={metric.description}>
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>
      ))}
      
      <Box sx={{ mt: 2, textAlign: 'right' }}>
        <Typography variant="body2" color="text.secondary">
          {selectedMetrics.length} métricas selecionadas
        </Typography>
      </Box>
    </Paper>
  );
};

export default MetricSelector;