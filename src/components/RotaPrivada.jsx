import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Conta ainda não escolheu papel (freelancer/empresa): só permite a tela de escolha
  if (!user.profile?.papel && location.pathname !== '/escolher-papel') {
    return <Navigate to="/escolher-papel" replace />;
  }

  return children;
}