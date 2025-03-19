import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import metaApiDiagnostic from '../../utils/metaApiDiagnostic';

/**
 * Componente para diagnóstico da API do Meta Ads
 * @param {Object} props - Propriedades do componente
 * @param {string} props.accountId - ID da conta Meta Ads
 */
const MetaApiDiagnosticTool = ({ accountId }) => {
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedTests, setExpandedTests] = useState({});

  /**
   * Executa o diagnóstico da API
   */
  const runDiagnostic = async () => {
    if (!accountId) {
      setDiagnosticReport({
        overallStatus: 'failure',
        summary: 'ID da conta não especificado',
        tests: []
      });
      return;
    }

    setLoading(true);
    try {
      const report = await metaApiDiagnostic.runDiagnostics(accountId);
      setDiagnosticReport(report);
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
      setDiagnosticReport({
        overallStatus: 'failure',
        summary: `Erro ao executar diagnóstico: ${error.message || 'Erro desconhecido'}`,
        tests: []
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Alterna a expansão de um teste
   * @param {string} testName - Nome do teste
   */
  const toggleTestExpansion = (testName) => {
    setExpandedTests(prev => ({
      ...prev,
      [testName]: !prev[testName]
    }));
  };

  /**
   * Renderiza o chip de status
   * @param {string} status - Status do teste ('success', 'failure', 'partial', 'pending')
   * @returns {JSX.Element} Chip de status
   */
  const renderStatusChip = (status) => {
    const statusConfig = {
      success: { color: 'success', label: 'Sucesso', icon: <CheckIcon /> },
      failure: { color: 'error', label: 'Falha', icon: <CloseIcon /> },
      partial: { color: 'warning', label: 'Parcial', icon: <HelpIcon /> },
      pending: { color: 'default', label: 'Pendente', icon: <RefreshIcon /> }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        color={config.color}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <BugReportIcon sx={{ mr: 1 }} /> Diagnóstico de API
          </Typography>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={runDiagnostic}
            disabled={loading}
          >
            {loading ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {!diagnosticReport && !loading && (
          <Alert severity="info">
            <AlertTitle>Informação</AlertTitle>
            Clique em "Executar Diagnóstico" para verificar a conexão com a API do Meta Ads e identificar possíveis problemas.
          </Alert>
        )}

        {diagnosticReport && (
          <>
            <Alert severity={
              diagnosticReport.overallStatus === 'success' ? 'success' :
              diagnosticReport.overallStatus === 'partial' ? 'warning' : 'error'
            } sx={{ mb: 2 }}>
              <AlertTitle>Resultado do Diagnóstico</AlertTitle>
              {diagnosticReport.summary}
            </Alert>

            <Paper variant="outlined" sx={{ mb: 2, p: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Detalhes do Ambiente
              </Typography>
              <Typography variant="body2">
                URL da API: {diagnosticReport.environment?.apiUrl || 'N/A'}
              </Typography>
              <Typography variant="body2">
                Data do Teste: {new Date(diagnosticReport.timestamp).toLocaleString()}
              </Typography>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Resultados dos Testes
            </Typography>
            <List>
              {diagnosticReport.tests.map((test, index) => (
                <React.Fragment key={`test-${index}`}>
                  <ListItem
                    button
                    onClick={() => toggleTestExpansion(test.name)}
                    sx={{ 
                      bgcolor: expandedTests[test.name] ? 'rgba(0, 0, 0, 0.04)' : 'transparent'
                    }}
                  >
                    <ListItemIcon>
                      {test.status === 'success' ? (
                        <CheckIcon color="success" />
                      ) : (
                        <CloseIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={test.name}
                      secondary={test.details}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {renderStatusChip(test.status)}
                      <IconButton
                        size="small"
                        sx={{
                          transform: expandedTests[test.name] ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s'
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  </ListItem>

                  <Collapse in={expandedTests[test.name]} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      {test.error && (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 1.5, 
                            bgcolor: 'rgba(211, 47, 47, 0.04)', 
                            borderColor: 'error.light' 
                          }}
                        >
                          <Typography variant="subtitle2" color="error">
                            Detalhes do Erro:
                          </Typography>
                          {test.error.status && (
                            <Typography variant="body2">
                              Status: {test.error.status} ({test.error.statusText || 'N/A'})
                            </Typography>
                          )}
                          {test.error.url && (
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              URL: {test.error.url}
                            </Typography>
                          )}
                          {test.error.data && (
                            <Typography variant="body2">
                              Resposta: {JSON.stringify(test.error.data)}
                            </Typography>
                          )}
                          {test.error.message && (
                            <Typography variant="body2">
                              Mensagem: {test.error.message}
                            </Typography>
                          )}
                        </Paper>
                      )}
                    </Box>
                  </Collapse>
                  
                  {index < diagnosticReport.tests.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MetaApiDiagnosticTool;
