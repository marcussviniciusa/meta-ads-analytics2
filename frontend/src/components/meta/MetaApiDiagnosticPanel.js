import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  AlertTitle
} from '@mui/material';
import MetaApiDiagnosticTool from './MetaApiDiagnosticTool';

/**
 * Painel que contém a ferramenta de diagnóstico da API do Meta Ads
 * @param {Object} props - Propriedades do componente
 * @param {string} props.accountId - ID da conta do Meta Ads
 * @param {boolean} props.show - Controla se o painel deve ser exibido
 */
const MetaApiDiagnosticPanel = ({ accountId, show }) => {
  if (!show) return null;
  
  return (
    <Box sx={{ mt: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ferramenta de Diagnóstico
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Problemas detectados na API do Meta Ads</AlertTitle>
          Foram detectados problemas na comunicação com a API do Meta Ads. 
          Use a ferramenta de diagnóstico abaixo para identificar problemas específicos.
        </Alert>
        <MetaApiDiagnosticTool accountId={accountId} />
      </Paper>
    </Box>
  );
};

export default MetaApiDiagnosticPanel;
