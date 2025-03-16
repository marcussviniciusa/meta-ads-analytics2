import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente para proteger rotas que só podem ser acessadas por super admins
 * @param {Object} props - Propriedades do componente
 * @param {React.ReactNode} props.children - Children components
 * @returns {React.ReactNode} - Componente renderizado
 */
const ProtectedSuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log para depuração
    console.log('ProtectedSuperAdminRoute - Estado atual:');
    console.log('User:', user);
    console.log('User role:', user?.role);
    console.log('Is authenticated:', isAuthenticated);
    console.log('Is loading:', isLoading);
    console.log('Current location:', location.pathname);
  }, [user, isAuthenticated, isLoading, location]);

  if (isLoading) {
    // Mostrar algum indicador de carregamento enquanto verifica a autenticação
    return <div className="loading-spinner">Carregando...</div>;
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    console.log('Redirecionando para login: usuário não autenticado');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o usuário tem o papel de super_admin
  if (user?.role !== 'super_admin') {
    console.log('Redirecionando para dashboard: usuário não é super admin', user?.role);
    // Redirecionar para o dashboard principal se não for super admin
    return <Navigate to="/dashboard" replace />;
  }

  console.log('Renderizando conteúdo protegido para super admin');
  // Se for super admin, renderiza o conteúdo protegido
  return children;
};

export default ProtectedSuperAdminRoute;
