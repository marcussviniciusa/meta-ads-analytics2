import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

/**
 * Página de visualização de logs do sistema
 */
const SystemLogs = () => {
  // Estados
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [filters, setFilters] = useState({
    level: '',
    service: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Efeito para carregar logs na montagem do componente e quando os filtros mudarem
  useEffect(() => {
    fetchLogs();
    fetchAvailableServices();
  }, [page, rowsPerPage, refreshKey]);

  // Simular busca de logs do backend
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Aqui você faria uma chamada real à API
      // Exemplo: const response = await axios.get('/api/admin/logs', { params: { ...filters, page, limit: rowsPerPage } });
      
      // Simulando dados para demonstração
      const mockData = generateMockLogs();
      
      setTimeout(() => {
        setLogs(mockData.logs);
        setTotalRows(mockData.total);
        setLoading(false);
      }, 800);
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
      setError('Não foi possível carregar os logs do sistema. Tente novamente mais tarde.');
      setLoading(false);
    }
  };

  // Simular busca de serviços disponíveis para filtro
  const fetchAvailableServices = () => {
    setAvailableServices([
      'all',
      'authentication',
      'meta-ads',
      'google-analytics',
      'companies',
      'users',
      'campaigns',
      'database',
      'redis'
    ]);
  };

  // Gerar dados mock para demonstração
  const generateMockLogs = () => {
    const levels = ['info', 'warning', 'error', 'debug'];
    const services = availableServices.length > 0 
      ? availableServices.filter(s => s !== 'all') 
      : ['authentication', 'meta-ads', 'google-analytics'];
    
    const messages = [
      'Usuário autenticado com sucesso',
      'Token não encontrado para o usuário',
      'Falha ao obter contas de anúncios',
      'Relatório GA4 recebido com sucesso',
      'Erro ao conectar com a API do Meta',
      'Dados de campanha salvos no banco',
      'Cache Redis atualizado',
      'Request recebida para /api/companies',
      'Novo usuário registrado',
      'Conexão com banco de dados estabelecida',
      'Verificação de super administrador concluída',
      'Transação de banco de dados falhou'
    ];

    const mockLogs = Array(50).fill().map((_, i) => {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // Logs de erro para o usuário 9 (similar aos erros no output do console)
      if (i % 7 === 0) {
        return {
          id: i + 1,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          level: 'error',
          service: 'meta-ads',
          message: `Error getting user token: Token não encontrado para o usuário 9`,
          user_id: 9,
          details: `Error: Token não encontrado\n    at MetaService.getUserToken (/app/src/services/metaService.js:119:15)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async MetaService.getAdAccounts (/app/src/services/metaService.js:605:21)`
        };
      }
      
      // Logs bem-sucedidos para o usuário 4
      if (i % 5 === 0) {
        return {
          id: i + 1,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          level: 'info',
          service: 'meta-ads',
          message: `Campanha ${1202066602911700 + i} salva com sucesso. ID interno: ${i + 1}`,
          user_id: 4,
          details: null
        };
      }
      
      // Logs gerais
      return {
        id: i + 1,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        level,
        service,
        message: `${message}${level === 'error' ? ' - Erro #' + (i + 1) : ''}`,
        user_id: Math.floor(Math.random() * 10) + 1,
        details: level === 'error' ? `Stack trace simulado para o erro #${i + 1}` : null
      };
    });
    
    // Aplicar filtros
    let filteredLogs = [...mockLogs];
    
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }
    
    if (filters.service && filters.service !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.service === filters.service);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) || 
        (log.details && log.details.toLowerCase().includes(searchLower)) ||
        log.user_id.toString().includes(searchLower)
      );
    }
    
    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Paginação
    const paginatedLogs = filteredLogs.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    
    return {
      logs: paginatedLogs,
      total: filteredLogs.length
    };
  };

  // Handlers de paginação
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handler de filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Aplicar filtros
  const applyFilters = () => {
    setPage(0);
    setRefreshKey(prev => prev + 1);
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      level: '',
      service: '',
      search: '',
      startDate: '',
      endDate: ''
    });
    setPage(0);
    setRefreshKey(prev => prev + 1);
  };

  // Renderizar chip de nível
  const renderLevelChip = (level) => {
    const levelConfig = {
      error: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
      warning: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
      info: { color: 'info', icon: <InfoIcon fontSize="small" /> },
      debug: { color: 'default', icon: <InfoIcon fontSize="small" /> },
      success: { color: 'success', icon: <SuccessIcon fontSize="small" /> }
    };
    
    const config = levelConfig[level] || levelConfig.info;
    
    return (
      <Chip 
        icon={config.icon}
        label={level.toUpperCase()} 
        color={config.color}
        size="small"
      />
    );
  };

  // Formatar data/hora
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Logs do Sistema
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Visualize e analise logs de eventos do sistema
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Filtros</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Nível</InputLabel>
              <Select
                name="level"
                value={filters.level}
                onChange={handleFilterChange}
                label="Nível"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
                <MenuItem value="success">Success</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Serviço</InputLabel>
              <Select
                name="service"
                value={filters.service}
                onChange={handleFilterChange}
                label="Serviço"
              >
                <MenuItem value="">Todos</MenuItem>
                {availableServices.map(service => (
                  service !== 'all' && (
                    <MenuItem key={service} value={service}>
                      {service.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  )
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Data Inicial"
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Data Final"
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Buscar..."
              placeholder="Digite para buscar em mensagens, detalhes ou ID de usuário"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
              InputProps={{
                endAdornment: (
                  <SearchIcon color="action" />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={clearFilters}
            >
              Limpar Filtros
            </Button>
            <Button 
              variant="contained" 
              onClick={applyFilters}
              startIcon={<SearchIcon />}
            >
              Aplicar Filtros
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setRefreshKey(prev => prev + 1)}
              startIcon={<RefreshIcon />}
            >
              Atualizar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Alerta específico para o problema do usuário 9 */}
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Problema detectado: Usuário 9 sem token de acesso ao Meta Ads
        </Typography>
        <Typography variant="body2">
          Foram detectados múltiplos erros relacionados à falta de token para o usuário 9. 
          Recomendamos entrar em contato com este usuário para completar a integração com o Meta Ads.
        </Typography>
      </Alert>

      {/* Tabela de logs */}
      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 3 }}>
        <TableContainer>
          <Table stickyHeader aria-label="tabela de logs">
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Nível</TableCell>
                <TableCell>Serviço</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Mensagem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="error">{error}</Typography>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography>Nenhum log encontrado</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow hover>
                      <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                      <TableCell>{renderLevelChip(log.level)}</TableCell>
                      <TableCell>{log.service}</TableCell>
                      <TableCell>{log.user_id > 0 ? log.user_id : '-'}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{log.message}</Typography>
                          {log.details && (
                            <Accordion sx={{ mt: 1, boxShadow: 'none', backgroundColor: '#f5f5f5' }}>
                              <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`panel-details-${log.id}-content`}
                                id={`panel-details-${log.id}-header`}
                                sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}
                              >
                                <Typography variant="caption">Detalhes</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box
                                  component="pre"
                                  sx={{
                                    fontSize: '0.75rem',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    m: 0,
                                    p: 1,
                                    borderRadius: 1,
                                    backgroundColor: '#f0f0f0'
                                  }}
                                >
                                  {log.details}
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalRows}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>
    </Container>
  );
};

export default SystemLogs;
