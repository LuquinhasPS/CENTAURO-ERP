import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requiredPermission, requiredAction = 'read' }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission, requiredAction)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
