import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Paper,
  Grid,
  IconButton,
  Snackbar,
  Alert,
  ListItem,
  ListItemText,
  List,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch,
  MenuItem,
  InputLabel,
  Select,
  FormControl,
  Tooltip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Share as ShareIcon,
  GetApp as GetAppIcon,
  FileCopy as FileCopyIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PdfIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import reportService from '../../services/reportService';

/**
 * Componente para gerenciar relatórios (gerar PDF, criar links públicos)
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.reportData - Dados para gerar o relatório
 * @param {string} props.reportTitle - Título do relatório
 * @param {string} props.reportType - Tipo do relatório (ads, analytics, etc.)
 */
const ReportManager = ({ reportData, reportTitle, reportType }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicLinks, setPublicLinks] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', severity: 'info' });
  const [reportName, setReportName] = useState('');
  const [shareOptions, setShareOptions] = useState({
    expirationDays: 30,
    allowDownload: true,
    requirePassword: false,
    password: '',
    includeCharts: true
  });
  const [selectedTab, setSelectedTab] = useState('generate');
  const [publicLinksLoading, setPublicLinksLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  // Carregar links públicos existentes quando o modal é aberto
  useEffect(() => {
    if (open) {
      loadPublicLinks();
      setReportName(reportTitle || `Relatório ${reportType.toUpperCase()} - ${new Date().toLocaleDateString()}`);
    }
  }, [open, reportTitle, reportType]);

  // Carregar links públicos existentes
  const loadPublicLinks = async () => {
    try {
      setPublicLinksLoading(true);
      const links = await reportService.listPublicLinks();
      // Filtrar apenas os links relacionados ao tipo de relatório atual
      const filteredLinks = links.filter(link => link.reportType === reportType);
      setPublicLinks(filteredLinks);
    } catch (error) {
      console.error('Erro ao carregar links públicos:', error);
      showNotification('Erro ao carregar links compartilhados', 'error');
    } finally {
      setPublicLinksLoading(false);
    }
  };

  // Abrir modal
  const handleOpen = () => {
    setOpen(true);
  };

  // Fechar modal
  const handleClose = () => {
    setOpen(false);
    setCopySuccess('');
  };

  // Mostrar notificação
  const showNotification = (message, severity = 'success') => {
    setNotification({
      show: true,
      message,
      severity
    });
  };

  // Fechar notificação
  const handleCloseNotification = () => {
    setNotification({ ...notification, show: false });
  };

  // Gerar PDF
  const handleGeneratePDF = async () => {
    if (!reportName.trim()) {
      showNotification('Por favor, dê um nome ao relatório', 'warning');
      return;
    }

    try {
      setLoading(true);
      const result = await reportService.generatePDF({
        ...reportData,
        title: reportName,
        type: reportType,
        date: new Date().toISOString()
      }, {
        includeCharts: shareOptions.includeCharts
      });

      // Abrir PDF em nova janela
      const pdfWindow = window.open(result.downloadUrl, '_blank');
      if (!pdfWindow) {
        showNotification('O PDF foi gerado, mas o popup foi bloqueado. Verifique as configurações do seu navegador.', 'warning');
      } else {
        showNotification('PDF gerado com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      
      // Mensagem de erro mais detalhada para facilitar o diagnóstico
      let errorMessage = `Erro ao gerar PDF: ${error.message}`;
      
      // Verificar se é um problema de conexão com a API
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Erro de conexão com o servidor. Verifique sua conexão de internet e tente novamente.';
      } 
      // Verificar se é um erro de autenticação
      else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Erro de autenticação ao gerar o PDF. Tente fazer login novamente.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Criar link público
  const handleCreatePublicLink = async () => {
    if (!reportName.trim()) {
      showNotification('Por favor, dê um nome ao relatório', 'warning');
      return;
    }

    try {
      setLoading(true);
      const result = await reportService.createPublicLink({
        ...reportData,
        title: reportName,
        type: reportType,
        date: new Date().toISOString()
      }, {
        expirationDays: shareOptions.expirationDays,
        allowDownload: shareOptions.allowDownload,
        requirePassword: shareOptions.requirePassword,
        password: shareOptions.requirePassword ? shareOptions.password : null,
        includeCharts: shareOptions.includeCharts
      });

      showNotification('Link público criado com sucesso!', 'success');
      
      await loadPublicLinks();
      setSelectedTab('links');
    } catch (error) {
      console.error('Erro ao criar link público:', error);
      
      // Mensagem de erro mais detalhada para facilitar o diagnóstico
      let errorMessage = `Erro ao criar link público: ${error.message}`;
      
      // Verificar se é um problema de conexão com a API
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Erro de conexão com o servidor. Verifique sua conexão de internet e tente novamente.';
      } 
      // Verificar se é um erro de autenticação
      else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Erro de autenticação ao criar o link público. Tente fazer login novamente.';
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Copiar link para a área de transferência
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess('Link copiado!');
        setTimeout(() => setCopySuccess(''), 2000);
      },
      () => {
        setCopySuccess('Falha ao copiar!');
      }
    );
  };

  // Revogar link público
  const handleRevokeLink = async (shareId) => {
    if (!window.confirm('Tem certeza que deseja revogar este link? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await reportService.revokePublicLink(shareId);
      await loadPublicLinks();
      showNotification('Link revogado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao revogar link:', error);
      showNotification(`Erro ao revogar link: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Gerar relatório e compartilhar">
        <Button
          variant="contained"
          color="primary"
          startIcon={<DescriptionIcon />}
          onClick={handleOpen}
          sx={{ ml: 1 }}
        >
          Relatório
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <DescriptionIcon sx={{ mr: 1 }} />
            Gerenciar Relatórios
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box mb={3}>
            <TextField
              fullWidth
              label="Nome do Relatório"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              margin="normal"
              variant="outlined"
            />
          </Box>

          <Box display="flex" mb={2}>
            <Button
              variant={selectedTab === 'generate' ? 'contained' : 'outlined'}
              onClick={() => setSelectedTab('generate')}
              startIcon={<PdfIcon />}
              sx={{ mr: 1 }}
            >
              Gerar PDF
            </Button>
            <Button
              variant={selectedTab === 'share' ? 'contained' : 'outlined'}
              onClick={() => setSelectedTab('share')}
              startIcon={<ShareIcon />}
              sx={{ mr: 1 }}
            >
              Compartilhar
            </Button>
            <Button
              variant={selectedTab === 'links' ? 'contained' : 'outlined'}
              onClick={() => setSelectedTab('links')}
              startIcon={<LinkIcon />}
            >
              Links Ativos
            </Button>
          </Box>

          {selectedTab === 'generate' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Opções do PDF
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={shareOptions.includeCharts}
                    onChange={(e) => setShareOptions({ ...shareOptions, includeCharts: e.target.checked })}
                  />
                }
                label="Incluir gráficos e visualizações"
              />
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={20} /> : <PdfIcon />}
                  onClick={handleGeneratePDF}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Gerando...' : 'Gerar PDF'}
                </Button>
              </Box>
            </Paper>
          )}

          {selectedTab === 'share' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Opções de Compartilhamento
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Validade do Link</InputLabel>
                    <Select
                      value={shareOptions.expirationDays}
                      onChange={(e) => setShareOptions({ ...shareOptions, expirationDays: e.target.value })}
                      label="Validade do Link"
                    >
                      <MenuItem value={1}>1 dia</MenuItem>
                      <MenuItem value={7}>7 dias</MenuItem>
                      <MenuItem value={30}>30 dias</MenuItem>
                      <MenuItem value={90}>90 dias</MenuItem>
                      <MenuItem value={365}>1 ano</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shareOptions.allowDownload}
                        onChange={(e) => setShareOptions({ ...shareOptions, allowDownload: e.target.checked })}
                      />
                    }
                    label="Permitir download do PDF"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shareOptions.requirePassword}
                        onChange={(e) => setShareOptions({ ...shareOptions, requirePassword: e.target.checked })}
                      />
                    }
                    label="Proteger com senha"
                  />
                </Grid>
                {shareOptions.requirePassword && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Senha"
                      type="password"
                      value={shareOptions.password}
                      onChange={(e) => setShareOptions({ ...shareOptions, password: e.target.value })}
                      variant="outlined"
                    />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={shareOptions.includeCharts}
                        onChange={(e) => setShareOptions({ ...shareOptions, includeCharts: e.target.checked })}
                      />
                    }
                    label="Incluir gráficos e visualizações"
                  />
                </Grid>
              </Grid>
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={loading ? <CircularProgress size={20} /> : <ShareIcon />}
                  onClick={handleCreatePublicLink}
                  disabled={loading || (shareOptions.requirePassword && !shareOptions.password)}
                  fullWidth
                >
                  {loading ? 'Criando...' : 'Criar Link Público'}
                </Button>
              </Box>
            </Paper>
          )}

          {selectedTab === 'links' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Links Públicos Ativos
              </Typography>
              {publicLinksLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : publicLinks.length === 0 ? (
                <Alert severity="info">
                  Nenhum link público ativo para este tipo de relatório.
                </Alert>
              ) : (
                <List>
                  {publicLinks.map((link, index) => (
                    <React.Fragment key={link.shareId}>
                      <ListItem
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            color="error" 
                            onClick={() => handleRevokeLink(link.shareId)}
                            title="Revogar link"
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center">
                              <LinkIcon sx={{ mr: 1 }} />
                              <Typography variant="body1" noWrap sx={{ maxWidth: '250px' }}>
                                {link.title || 'Relatório sem título'}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary">
                                Criado em: {new Date(link.createdAt).toLocaleDateString()}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Expira em: {new Date(link.expiresAt).toLocaleDateString()}
                              </Typography>
                              <Box display="flex" alignItems="center" mt={1}>
                                <TextField
                                  size="small"
                                  value={link.publicUrl}
                                  variant="outlined"
                                  fullWidth
                                  InputProps={{
                                    readOnly: true,
                                  }}
                                />
                                <IconButton 
                                  color="primary" 
                                  onClick={() => copyToClipboard(link.publicUrl)}
                                  title="Copiar link"
                                >
                                  <FileCopyIcon />
                                </IconButton>
                              </Box>
                              {copySuccess && <Typography variant="caption" color="success.main">{copySuccess}</Typography>}
                            </>
                          }
                        />
                      </ListItem>
                      {index < publicLinks.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.show}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReportManager;
