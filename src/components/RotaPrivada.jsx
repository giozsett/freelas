import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
