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
  Box,
  Chip,
  Snackbar,
  Alert,
  TablePagination,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import UserService from '../../services/userService';
import CompanyService from '../../services/companyService';
import authService from '../../services/authService';
import api from '../../services/api';
import UserPermissions from '../../components/UserPermissions';

/**
 * Página de gerenciamento de usuários (Super Admin)
 */
const UsersPage = () => {
  // Estados
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create', 'edit' ou 'password'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ 
    email: '', 
    name: '', 
    password: '',
    confirmPassword: '',
    role: 'user',
    companyId: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Carregar dados dos usuários
  const loadUsers = async (page = 0, limit = 10, search = '') => {
    console.log('Carregando usuários:', { page: page + 1, limit, search });
    setLoading(true);
    try {
      const response = await UserService.getUsers({
        page: page + 1, // API usa base 1 para paginação
        limit,
        search
      });
      
      // Verificar e tratar a estrutura da resposta
      if (response && response.data) {
        const userData = response.data.users || response.data.data || [];
        const totalCount = response.data.pagination?.total || response.data.total || 0;
        
        console.log('Dados de usuários recebidos:', userData);
        setUsers(userData);
        setTotalRows(totalCount);
        setError(null);
      } else {
        console.error('Resposta da API inválida:', response);
        setUsers([]);
        setTotalRows(0);
        setError('Formato de resposta inválido do servidor');
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setUsers([]);
      setError('Não foi possível carregar os usuários. Tente novamente mais tarde.');
      showSnackbar('Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  // Carregar dados das empresas
  const loadCompanies = async () => {
    try {
      const response = await CompanyService.getCompanies({ limit: 100 });
      console.log('Dados de empresas recebidos:', response.data);
      
      // Lida com diferentes formatos de resposta possíveis
      if (response && response.data) {
        // Verifica o formato da resposta e extrai as empresas adequadamente
        const companiesData = response.data.companies || response.data.data || [];
        setCompanies(companiesData);
      } else {
        console.error('Resposta da API de empresas inválida:', response);
        setCompanies([]);
      }
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setCompanies([]);
      showSnackbar('Erro ao carregar lista de empresas', 'error');
    }
  };

  // Efeito para carregar usuários na montagem do componente
  useEffect(() => {
    loadUsers(page, rowsPerPage, searchTerm);
    loadCompanies();
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
    loadUsers(0, rowsPerPage, searchTerm);
  };

  // Mostrar snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fechar snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Abrir diálogo para criar usuário
  const handleOpenCreateDialog = () => {
    setDialogMode('create');
    // Resetar formulário e erros
    setFormData({ 
      email: '', 
      name: '', 
      password: '',
      confirmPassword: '',
      role: 'user',
      companyId: ''
    });
    setErrors({});
    setOpenDialog(true);
    console.log('Formulário de criação de usuário aberto e resetado');
  };

  // Abrir diálogo para editar usuário
  const handleOpenEditDialog = (user) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setFormData({ 
      email: user.email, 
      name: user.name,
      role: user.role,
      companyId: user.company?.id || '',
      password: '',
      confirmPassword: ''
    });
    setOpenDialog(true);
  };

  // Abrir diálogo para alterar senha
  const handleOpenPasswordDialog = (user) => {
    setDialogMode('password');
    setSelectedUser(user);
    setFormData({ 
      ...formData,
      password: '',
      confirmPassword: ''
    });
    setOpenDialog(true);
  };

  // Fechar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    console.log('Validando formulário, modo:', dialogMode);
    console.log('Dados do formulário:', {
      ...formData,
      password: formData.password ? '***' : undefined,
      confirmPassword: formData.confirmPassword ? '***' : undefined
    });
    
    // Validação básica
    if (!formData.name) {
      newErrors.name = 'Nome é obrigatório';
      isValid = false;
      console.log('ERRO: Nome não informado');
    }
    
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
      isValid = false;
      console.log('ERRO: Email não informado');
    } else {
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email inválido';
        isValid = false;
        console.log('ERRO: Email inválido:', formData.email);
      }
    }

    // Validar papel/role do usuário
    if (!formData.role) {
      newErrors.role = 'Papel do usuário é obrigatório';
      isValid = false;
      console.log('ERRO: Papel do usuário não informado');
    } else {
      console.log('Papel selecionado:', formData.role);
    }
    
    // Validar empresa (pode ser opcional dependendo do papel)
    if (formData.role === 'user' && !formData.companyId) {
      newErrors.companyId = 'Empresa é obrigatória para usuários regulares';
      isValid = false;
      console.log('ERRO: Empresa não informada para usuário regular');
    } else if (formData.companyId) {
      console.log('Empresa selecionada:', formData.companyId);
    }

    // Validar senha para criação ou alteração de senha
    if (dialogMode === 'create' || dialogMode === 'password') {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória';
        isValid = false;
        console.log('ERRO: Senha não informada');
      } else if (formData.password.length < 8) {
        newErrors.password = 'A senha deve ter no mínimo 8 caracteres';
        isValid = false;
        console.log('ERRO: Senha com menos de 8 caracteres');
      }
      
      // Validar confirmação de senha
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
        isValid = false;
        console.log('ERRO: Confirmação de senha não informada');
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
        isValid = false;
        console.log('ERRO: Senhas não coincidem', { 
          password: formData.password ? '***' : undefined, 
          confirmPassword: formData.confirmPassword ? '***' : undefined,
          iguais: formData.password === formData.confirmPassword
        });
      }
    }

    setErrors(newErrors);
    
    if (!isValid) {
      console.log('Validação falhou. Erros:', newErrors);
      showSnackbar('Verifique os campos obrigatórios', 'error');
    } else {
      console.log('Validação bem-sucedida!');
    }
    
    return isValid;
  };

  // Salvar usuário
  const handleSaveUser = async () => {
    console.log('Iniciando tentativa de salvar usuário...');
    console.log('Estado atual do formulário:', {
      ...formData,
      password: formData.password ? '***' : undefined,
      confirmPassword: formData.confirmPassword ? '***' : undefined
    });
    
    if (!validateForm()) {
      console.log('Validação falhou, abortando salvamento');
      return;
    }

    setSaving(true);
    try {
      const userData = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        companyId: formData.companyId ? parseInt(formData.companyId, 10) : null
      };

      // Adiciona senha apenas quando necessário
      if (dialogMode === 'create' || dialogMode === 'password') {
        userData.password = formData.password;
      }
      
      // Validação extra para garantir que role está definido
      if (!userData.role && dialogMode === 'create') {
        console.warn('ALERTA: Papel não definido. Definindo papel padrão como "user"');
        userData.role = 'user';
      }
      
      // Validação extra para companyId
      if (userData.role === 'user' && !userData.companyId && dialogMode === 'create') {
        console.error('ERRO CRÍTICO: Empresa não definida para usuário regular!');
        throw new Error('Empresa é obrigatória para usuários regulares');
      }
      
      // Log para diagnóstico - omitindo senha
      console.log('Dados de usuário preparados:', { 
        ...userData, 
        password: userData.password ? '***' : undefined,
        role_type: typeof userData.role,
        companyId_type: typeof userData.companyId
      });

      console.log(`Enviando dados do usuário (${dialogMode}):`, {...userData, password: userData.password ? '***' : undefined});

      if (dialogMode === 'create') {
        console.log('Iniciando processo de criação de usuário...');
        try {
          // Obter o usuário logado para ver se tem permissão adequada
          const currentUser = JSON.parse(localStorage.getItem('user'));
          if (!currentUser || !currentUser.email) {
            throw new Error('Dados de usuário não encontrados. Faça login novamente.');
          }
          
          console.log('Verificando permissões:', {
            userRole: currentUser.role,
            isSuperAdmin: currentUser.role === 'super_admin',
            isAdmin: currentUser.role === 'admin'
          });
          
          // Usamos o token atual do usuário para a solicitação
          console.log('Usando token atual do usuário para criar novo usuário...');
          // Verificar se temos um token válido
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('Token não encontrado');
            throw new Error('Sessão expirada. Faça login novamente.');
          }
          
          // Ajustar os dados do usuário: garantir que o papel seja enviado corretamente
          // O backend verificará se usuário logado é super_admin para permitir definir roles
          console.log('Dados finais para criação de usuário:', {
            ...userData,
            password: userData.password ? '***' : undefined
          });
          
          // Garantir que a role (papel) está definida corretamente
          if (!userData.role) {
            userData.role = 'user'; // valor padrão
            console.log('Definindo papel padrão como "user"');
          }
          
          // Log detalhado dos dados que serão enviados
          console.log('Dados completos para API:', Object.keys(userData).map(key => {
            return `${key}: ${key === 'password' ? '***' : userData[key]}`;
          }));
          
          // Agora tenta criar o usuário com o token renovado
          const response = await api.post('/auth/register', userData);
          console.log('Resposta da criação de usuário:', response);
          showSnackbar('Usuário criado com sucesso!');
        } catch (createError) {
          console.error('Erro específico na criação de usuário:', createError);
          // Exibir detalhes mais específicos do erro
          console.error('Detalhes do erro:', {
            status: createError.response?.status,
            message: createError.response?.data?.message || createError.message,
            data: createError.response?.data
          });
          throw createError; // Re-throw para ser tratado no catch externo
        }
      } else if (dialogMode === 'edit') {
        await UserService.updateUser(selectedUser.id, userData);
        showSnackbar('Usuário atualizado com sucesso!');
      } else if (dialogMode === 'password') {
        await UserService.updateUser(selectedUser.id, {
          password: formData.password
        });
        showSnackbar('Senha atualizada com sucesso!');
      }
      
      handleCloseDialog();
      // Pequeno atraso para garantir que o backend processou a operação
      setTimeout(() => {
        loadUsers(page, rowsPerPage, searchTerm);
      }, 500);
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      
      // Log mais detalhado do erro
      console.error('Detalhes completos do erro:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        } : 'Sem resposta',
        request: err.request ? 'Requisição enviada sem resposta' : 'Sem requisição'
      });
      
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Erro desconhecido';
      console.error('Mensagem de erro:', errorMessage);
      
      // Exibir mensagem adequada para o usuário
      if (errorMessage.includes('obrigatório') || err.response?.status === 400) {
        showSnackbar(`Erro ao criar usuário: Verifique se todos os campos obrigatórios estão preenchidos`, 'error');
      } else if (err.response?.status === 401) {
        showSnackbar('Erro de autenticação. Tente fazer login novamente.', 'error');
      } else {
        showSnackbar(
          `Erro ao ${
            dialogMode === 'create' ? 'criar' : dialogMode === 'edit' ? 'atualizar' : 'alterar senha do'
          } usuário. ${errorMessage}`,
          'error'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Excluir usuário
  const handleDeleteUser = async (user) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) {
      try {
        await UserService.deleteUser(user.id);
        showSnackbar('Usuário excluído com sucesso!');
        loadUsers(page, rowsPerPage, searchTerm);
      } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        showSnackbar(`Erro ao excluir usuário. ${err.response?.data?.message || 'Tente novamente.'}`, 'error');
      }
    }
  };

  // Atualizar formulário
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Renderizar chip de papel do usuário
  const renderRoleChip = (role) => {
    switch (role) {
      case 'super_admin':
        return <Chip label="Super Admin" color="error" size="small" />;
      case 'admin':
        return <Chip label="Admin" color="warning" size="small" />;
      default:
        return <Chip label="Usuário" color="primary" size="small" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Gerenciamento de Usuários</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Novo Usuário
        </Button>
      </Box>

      {/* Barra de busca */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Buscar usuários..."
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

      {/* Tabela de usuários */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="tabela de usuários">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Data de Criação</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="error">{error}</Typography>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography>Nenhum usuário encontrado</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{renderRoleChip(user.role)}</TableCell>
                    <TableCell>{user.company?.name || '—'}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Alterar Senha">
                        <IconButton 
                          color="secondary" 
                          onClick={() => handleOpenPasswordDialog(user)}
                        >
                          <LockIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenEditDialog(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.role === 'super_admin'} // Impedir exclusão do super admin
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

      {/* Diálogo para criar/editar usuário */}
      <Dialog
        open={dialogMode !== 'password' && openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="user-dialog-title"
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id="user-dialog-title">
          {dialogMode === 'create' ? 'Criar Novo Usuário' : 'Editar Usuário'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nome"
                fullWidth
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                fullWidth
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Senha"
                type="password"
                fullWidth
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                error={!!errors.password}
                helperText={errors.password || (dialogMode === 'edit' ? 'Deixe em branco para manter a senha atual' : '')}
              />
            </Grid>
            {dialogMode === 'create' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Confirmar Senha"
                  type="password"
                  fullWidth
                  value={formData.confirmPassword || ''}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Papel</InputLabel>
                <Select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  label="Papel"
                >
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="user">Usuário</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Empresa</InputLabel>
                <Select
                  value={formData.companyId || ''}
                  onChange={e => setFormData({ ...formData, companyId: e.target.value })}
                  label="Empresa"
                >
                  {companies && companies.filter(c => c && typeof c === 'object' && c.id).map(company => (
                    <MenuItem key={company.id} value={company.id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Componente de permissões para usuários em modo de edição */}
            {dialogMode === 'edit' && selectedUser && selectedUser.id && (
              <Grid item xs={12} sx={{ mt: 3 }}>
                <UserPermissions 
                  userId={selectedUser.id} 
                  username={selectedUser.name}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveUser}
            color="primary"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para alterar senha */}
      <Dialog
        open={dialogMode === 'password' && openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="password-dialog-title"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="password-dialog-title">
          Alterar Senha
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="password"
            label="Nova Senha"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            error={!!errors.password}
            helperText={errors.password}
            sx={{ mb: 2, mt: 2 }}
          />
          <TextField
            margin="dense"
            name="confirmPassword"
            label="Confirmar Senha"
            type="password"
            fullWidth
            variant="outlined"
            value={formData.confirmPassword}
            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
            helperText={formData.password !== formData.confirmPassword && formData.confirmPassword !== '' 
              ? 'As senhas não coincidem' 
              : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveUser}
            color="primary"
            disabled={saving || formData.password !== formData.confirmPassword}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Salvando...' : 'Salvar'}
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

export default UsersPage;
