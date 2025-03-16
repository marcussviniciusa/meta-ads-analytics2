import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, IconButton, Drawer, 
  List, ListItem, ListItemIcon, ListItemText, Box, Divider 
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Campaign as CampaignIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  Sync as IntegrationIcon,
  BarChart as AnalyticsIcon,
  Business as BusinessIcon,
  SupervisorAccount as AdminIcon,
  People as UsersIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Contas de Anúncios', icon: <AccountIcon />, path: '/ad-accounts' },
    { text: 'Campanhas', icon: <CampaignIcon />, path: '/campaigns' },
    { text: 'Relatórios', icon: <ReportIcon />, path: '/reports' },
    { text: 'Meta Ads', icon: <IntegrationIcon />, path: '/connect-meta' },
    { text: 'Google Analytics', icon: <AnalyticsIcon />, path: '/google-analytics' },
    { text: 'Configurações', icon: <SettingsIcon />, path: '/settings' },
  ];

  // Itens de menu para Super Admin
  const adminMenuItems = [
    { text: 'Painel Admin', icon: <AdminIcon />, path: '/admin' },
    { text: 'Gerenciar Empresas', icon: <BusinessIcon />, path: '/admin/companies' },
    { text: 'Gerenciar Usuários', icon: <UsersIcon />, path: '/admin/users' },
  ];

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          Meta Ads Analytics
        </Typography>
        {user && (
          <>
            <Typography variant="body2" color="text.secondary">
              {user.name}
            </Typography>
            {user.role === 'super_admin' && (
              <Typography variant="caption" sx={{ mt: 0.5, bgcolor: 'error.main', color: 'white', px: 1, py: 0.5, borderRadius: 1 }}>
                Super Admin
              </Typography>
            )}
          </>
        )}
      </Box>
      <Divider />
      
      {/* Menu de Administração (apenas para super_admin) */}
      {user && user.role === 'super_admin' && (
        <>
          <List>
            {adminMenuItems.map((item) => (
              <ListItem 
                button 
                key={item.text} 
                component={Link} 
                to={item.path}
                selected={isActive(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Divider />
        </>
      )}
      
      {/* Menu regular */}
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={Link} 
            to={item.path}
            selected={isActive(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Meta Ads Analytics
          </Typography>
          {user ? (
            <>
              {user.role === 'super_admin' && (
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/admin"
                  sx={{ mr: 2 }}
                >
                  Painel Admin
                </Button>
              )}
              <Button color="inherit" onClick={handleLogout}>Sair</Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">Login</Button>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navigation;
