import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Chip,
  Snackbar,
  Alert,
  TablePagination,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import CompanyService from '../../services/companyService';

/**
 * Página de gerenciamento de empresas (Super Admin)
 */
const CompaniesPage = () => {
  // Estados
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' ou 'edit'
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({ name: '', active: true });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  // Carregar dados das empresas
  const loadCompanies = async (page = 0, limit = 10, search = '') => {
    setLoading(true);
    try {
      console.log('Carregando empresas:', { page: page + 1, limit, search });
      const response = await CompanyService.getCompanies({
        page: page + 1, // API usa base 1 para paginação
        limit,
        search
      });
      
      // Verificar se a resposta contém os dados esperados
      if (response && response.data) {
        console.log('Dados recebidos:', response.data);
        
        // Verificar a estrutura dos dados retornados
        if (response.data.companies && Array.isArray(response.data.companies)) {
          setCompanies(response.data.companies);
          setTotalRows(response.data.pagination?.total || response.data.companies.length);
        } else if (Array.isArray(response.data.data)) {
          setCompanies(response.data.data);
          setTotalRows(response.data.total || response.data.data.length);
        } else if (Array.isArray(response.data)) {
          setCompanies(response.data);
          setTotalRows(response.data.length);
        } else {
          console.error('Estrutura de dados não reconhecida:', response.data);
          setCompanies([]);
          setTotalRows(0);
        }
        
        setError(null);
      } else {
        console.error('Resposta da API não contém dados esperados:', response);
        setCompanies([]);
        setTotalRows(0);
        setError('Resposta da API inválida. Contate o administrador.');
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setCompanies([]);
      setTotalRows(0);
      setError('Não foi possível carregar as empresas. Tente novamente mais tarde.');
      showSnackbar('Erro ao carregar empresas: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  // Efeito para carregar empresas na montagem do componente
  useEffect(() => {
    loadCompanies(page, rowsPerPage, searchTerm);
  }, [page, rowsPerPage]);

  // Handlers de paginação
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handler de busca
  const handleSearch = () => {
    setSearching(true);
    setPage(0);
    loadCompanies(0, rowsPerPage, searchTerm);
  };

  // Mostrar snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Abrir diálogo para criar empresa
  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    setFormData({ name: '', active: true });
    setOpenDialog(true);
  };

  // Abrir diálogo para editar empresa
  const handleOpenEditDialog = (company) => {
    if (!company) {
      console.error('Tentativa de editar empresa inexistente');
      showSnackbar('Erro ao abrir formulário de edição', 'error');
      return;
    }
    
    setDialogMode('edit');
    setSelectedCompany(company);
    setFormData({ name: company.name, active: company.active });
    setOpenDialog(true);
  };

  // Fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCompany(null);
  };

  // Salvar empresa
  const handleSaveCompany = async () => {
    try {
      if (dialogMode === 'create') {
        const response = await CompanyService.createCompany(formData);
        console.log('Empresa criada com sucesso:', response.data);
        showSnackbar('Empresa criada com sucesso!');
      } else {
        await CompanyService.updateCompany(selectedCompany.id, formData);
        showSnackbar('Empresa atualizada com sucesso!');
      }
      
      handleCloseDialog();
      
      // Pequeno atraso para garantir que o backend processou a mudança
      setTimeout(() => {
        loadCompanies(page, rowsPerPage, searchTerm);
      }, 300);
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      showSnackbar(
        `Erro ao ${dialogMode === 'create' ? 'criar' : 'atualizar'} empresa. ${err.response?.data?.message || 'Tente novamente.'}`,
        'error'
      );
    }
  };

  // Excluir empresa
  const handleDeleteCompany = async (company) => {
    if (!company) {
      console.error('Tentativa de excluir empresa inexistente');
      showSnackbar('Erro ao excluir empresa', 'error');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir a empresa "${company.name}"?`)) {
      try {
        await CompanyService.deleteCompany(company.id);
        showSnackbar('Empresa excluída com sucesso!');
        loadCompanies(page, rowsPerPage, searchTerm);
      } catch (err) {
        console.error('Erro ao excluir empresa:', err);
        showSnackbar(`Erro ao excluir empresa. ${err.response?.data?.message || 'Tente novamente.'}`, 'error');
      }
    }
  };

  // Atualizar formulário
  const handleFormChange = (event) => {
    if (!event || !event.target) {
      console.error('Evento de formulário inválido:', event);
      return;
    }
    
    const { name, value, checked } = event.target;
    setFormData({
      ...formData,
      [name]: name === 'active' ? checked : value
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Gerenciamento de Empresas</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Nova Empresa
        </Button>
      </Box>

      {/* Barra de busca */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Buscar empresas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flexGrow: 1, mr: 2 }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSearch}
          startIcon={searching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
          disabled={searching}
        >
          Buscar
        </Button>
      </Paper>

      {/* Tabela de empresas */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="tabela de empresas">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data de Criação</TableCell>
                <TableCell align="right">Ações</TableCell>
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
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography>Nenhuma empresa encontrada</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id} hover>
                    <TableCell>{company.id}</TableCell>
                    <TableCell>{company.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={company.active ? 'Ativo' : 'Inativo'} 
                        color={company.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(company.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Visualizar Usuários">
                        <IconButton 
                          color="info" 
                          component="a"
                          href={`/admin/companies/${company.id}/users`}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenEditDialog(company)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteCompany(company)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
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

      {/* Diálogo para criar/editar empresa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Criar Nova Empresa' : 'Editar Empresa'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Nome da Empresa"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleFormChange}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.active}
                onChange={handleFormChange}
                name="active"
                color="primary"
              />
            }
            label="Empresa Ativa"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSaveCompany} 
            variant="contained" 
            color="primary"
            disabled={!formData.name.trim()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CompaniesPage;
