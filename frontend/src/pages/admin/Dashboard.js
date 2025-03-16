import React from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Box, 
  Card, 
  CardContent, 
  Button 
} from '@mui/material';
import { Business, Person, Dashboard as DashboardIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';

/**
 * Dashboard do Super Admin
 */
const AdminDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Painel Administrativo
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Gerencie empresas e usuários do SpeedFunnels
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Card de Empresas */}
        <Grid item xs={12} md={4} lg={4}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Business sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Empresas
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Gerencie as empresas cadastradas no SpeedFunnels, crie novas empresas e administre suas configurações.
              </Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  component={Link} 
                  to="/admin/companies" 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                >
                  Gerenciar Empresas
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Usuários */}
        <Grid item xs={12} md={4} lg={4}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Person sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Usuários
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Gerencie os usuários do sistema, crie novos administradores e controle permissões de acesso.
              </Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  component={Link} 
                  to="/admin/users" 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                >
                  Gerenciar Usuários
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Dashboards */}
        <Grid item xs={12} md={4} lg={4}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <DashboardIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Visualize estatísticas do sistema, uso de recursos e métricas globais de todas as empresas.
              </Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  component={Link} 
                  to="/admin/analytics" 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                >
                  Ver Analytics
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
