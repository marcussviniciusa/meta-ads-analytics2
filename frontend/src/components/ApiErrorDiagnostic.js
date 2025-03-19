import React from 'react';
import {
  Typography,
  Box,
  Paper,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

/**
 * Componente de diagnóstico para erros de API
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.error - Objeto de erro
 * @param {string} props.apiType - Tipo de API ('meta' ou 'ga')
 * @param {Function} props.onRetry - Função para tentar novamente
 * @returns {JSX.Element} Componente de diagnóstico
 */
const ApiErrorDiagnostic = ({ error, apiType, onRetry }) => {
  if (!error) return null;
  
  const isMetaApi = apiType === 'meta';
  const apiName = isMetaApi ? 'Meta Ads' : 'Google Analytics';
  const iconColor = isMetaApi ? 'error' : 'warning';
  const backgroundColor = isMetaApi ? '#ffebee' : '#fff8e1';
  const headerColor = isMetaApi ? '#ffcdd2' : '#ffecb3';
  const Icon = isMetaApi ? ErrorIcon : WarningIcon;
  
  const getErrorTitle = () => {
    switch (error.type) {
      case 'auth_error': return `Erro de Autenticação no ${apiName}`;
      case 'permission_error': return `Erro de Permissão no ${apiName}`;
      case 'format_error': return `Erro de Formato de Resposta no ${apiName}`;
      case 'html_error': return `Resposta HTML Inesperada no ${apiName}`;
      case 'integration_error': return `Erro de Integração com ${apiName}`;
      case 'rate_limit_error': return `Limite de Requisições Excedido no ${apiName}`;
      case 'token_error': return `Erro de Token no ${apiName}`;
      default: return `Erro na API do ${apiName}`;
    }
  };
  
  const getErrorInstructions = () => {
    if (isMetaApi) {
      // Instruções específicas para Meta Ads
      switch (error.type) {
        case 'auth_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Reconecte sua conta do Facebook/Meta</li>
                <li>Verifique se seu usuário tem acesso ao Business Manager</li>
                <li>Verifique se você concedeu permissões suficientes durante a autenticação</li>
              </ul>
            </>
          );
        case 'permission_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Certifique-se de ter acesso às contas de anúncios no Business Manager</li>
                <li>Verifique se você tem a função adequada nas contas de anúncio</li>
                <li>Verifique se as permissões de API estão habilitadas para essas contas</li>
              </ul>
            </>
          );
        case 'rate_limit_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>A API do Meta tem limites de requisições por hora/dia</li>
                <li>Aguarde alguns minutos e tente novamente</li>
                <li>Reduza a frequência de atualizações</li>
              </ul>
            </>
          );
        case 'token_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Seu token de acesso expirou ou é inválido</li>
                <li>Reconecte sua conta do Facebook/Meta</li>
                <li>Verifique se você concedeu permissões suficientes durante a autenticação</li>
              </ul>
            </>
          );
        default:
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Verifique sua conexão com a internet</li>
                <li>Certifique-se de que a API do Meta Ads está disponível</li>
                <li>Tente novamente mais tarde</li>
              </ul>
            </>
          );
      }
    } else {
      // Instruções específicas para Google Analytics
      switch (error.type) {
        case 'auth_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Reconecte sua conta do Google Analytics</li>
                <li>Verifique se você tem permissões para acessar as propriedades do GA4</li>
                <li>Verifique se o token de acesso não expirou</li>
              </ul>
            </>
          );
        case 'permission_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Certifique-se de ter permissões para acessar as propriedades do GA4</li>
                <li>Verifique se o usuário tem permissões adequadas no GA4</li>
              </ul>
            </>
          );
        case 'format_error':
        case 'html_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Pode haver um problema com a configuração CORS</li>
                <li>O servidor pode estar retornando uma página de erro ou redirecionamento</li>
                <li>Tente reconectar sua conta do Google Analytics</li>
              </ul>
            </>
          );
        case 'integration_error':
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>É necessário conectar sua conta do Google Analytics</li>
                <li>Vá para as configurações e conecte sua conta Google Analytics</li>
              </ul>
            </>
          );
        default:
          return (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>Verifique os seguintes itens:</Typography>
              <ul>
                <li>Verifique sua conexão com a internet</li>
                <li>Certifique-se de que o Google Analytics API está disponível</li>
                <li>Tente novamente mais tarde</li>
              </ul>
            </>
          );
      }
    }
  };
  
  return (
    <Accordion 
      sx={{ 
        mb: 2, 
        backgroundColor: backgroundColor,
        '&:before': {
          display: 'none',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ backgroundColor: headerColor }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon color={iconColor} sx={{ mr: 1 }} />
          <Typography variant="subtitle1">{getErrorTitle()}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Alert severity={isMetaApi ? "error" : "warning"} sx={{ mb: 2 }}>
          {error.message || `Encontramos um problema ao tentar acessar a API do ${apiName}`}
        </Alert>
        
        <Typography variant="subtitle2" gutterBottom>Solução de problemas:</Typography>
        {getErrorInstructions()}
        
        {error.details && (
          <>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Detalhes técnicos:</Typography>
            <Paper elevation={0} sx={{ p: 1, backgroundColor: '#f5f5f5', maxHeight: 200, overflow: 'auto' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}
              </pre>
            </Paper>
          </>
        )}
        
        {onRetry && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={onRetry}
            >
              Tentar Novamente
            </Button>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ApiErrorDiagnostic;
