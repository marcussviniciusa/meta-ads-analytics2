import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Container, Paper, TextField, Button, Typography, Box, 
  Divider, Alert, CircularProgress, Tab, Tabs 
} from '@mui/material';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [tab, setTab] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setErrorMessage('');
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email) {
      errors.email = 'O email é obrigatório';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Formato de email inválido';
    }
    
    if (!formData.password) {
      errors.password = 'A senha é obrigatória';
    } else if (formData.password.length < 6) {
      errors.password = 'A senha deve ter pelo menos 6 caracteres';
    }
    
    if (tab === 1 && !formData.name) {
      errors.name = 'O nome é obrigatório';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (tab === 0) {
        // Login
        await login({ email: formData.email, password: formData.password });
      } else {
        // Register
        await register({
          email: formData.email,
          password: formData.password,
          name: formData.name
        });
      }
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Ocorreu um erro. Tente novamente.');
    }
  };

  const responseFacebook = async (response) => {
    if (response.accessToken) {
      try {
        // Para implementação completa, seria necessário enviar o token para o backend
        // e criar uma conta/login com as informações do Facebook
        console.log('Facebook login successful', response);
        // Por enquanto, vamos apenas navegar para a tela de conexão com Meta Ads
        navigate('/connect-meta', { 
          state: { 
            facebookToken: response.accessToken,
            facebookUserId: response.userID 
          } 
        });
      } catch (error) {
        setErrorMessage('Erro ao autenticar com Facebook. Tente novamente.');
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Meta Ads Analytics
        </Typography>
        
        <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
          Ferramenta de análise de anúncios do Meta
        </Typography>
        
        <Box sx={{ mb: 4, mt: 3 }}>
          <Tabs value={tab} onChange={handleTabChange} centered>
            <Tab label="Login" />
            <Tab label="Cadastro" />
          </Tabs>
        </Box>
        
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMessage}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {tab === 1 && (
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Nome"
              name="name"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              error={!!formErrors.name}
              helperText={formErrors.name}
            />
          )}
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={!!formErrors.email}
            helperText={formErrors.email}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Senha"
            type="password"
            id="password"
            autoComplete={tab === 0 ? "current-password" : "new-password"}
            value={formData.password}
            onChange={handleChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 3, mb: 2 }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              tab === 0 ? 'Entrar' : 'Cadastrar'
            )}
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }}>ou</Divider>
        
        <FacebookLogin
          appId={process.env.REACT_APP_FACEBOOK_APP_ID || "META_APP_ID_HERE"}
          callback={responseFacebook}
          fields="name,email,picture"
          render={renderProps => (
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={renderProps.onClick}
              disabled={renderProps.isDisabled || loading}
              sx={{ mb: 2 }}
            >
              Continuar com Facebook
            </Button>
          )}
        />
        
        <Typography variant="body2" align="center" color="textSecondary" sx={{ mt: 3 }}>
          {tab === 0 ? 
            "Não tem uma conta? " : 
            "Já tem uma conta? "}
          <Link 
            to="#" 
            onClick={(e) => {
              e.preventDefault();
              handleTabChange(null, tab === 0 ? 1 : 0);
            }}
            style={{ textDecoration: 'none' }}
          >
            {tab === 0 ? "Cadastre-se" : "Faça login"}
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Login;
