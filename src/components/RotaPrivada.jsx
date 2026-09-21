import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/ContextoAutenticacao';

const ROTAS_SEM_PAPEL = new Set(['/escolher-papel', '/criar-perfil-empresa']);

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Conta ainda não escolheu papel (freelancer/empresa): só permite a escolha
  // e o wizard de criação de perfil de empresa
  if (!user.profile?.papel && !ROTAS_SEM_PAPEL.has(location.pathname)) {
    return <Navigate to="/escolher-papel" replace />;
  }

  return children;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};