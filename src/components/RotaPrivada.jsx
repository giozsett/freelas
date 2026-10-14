import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/ContextoAutenticacao';
import { PAPEL_ADMIN, PAPEL_CONTRATANTE, PAPEL_FREELANCER } from '../constants/papeis';

const ROTAS_SEM_PAPEL = new Set(['/escolher-papel', '/criar-perfil-empresa']);

export default function PrivateRoute({ children, papel }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '5rem' }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Conta ainda não escolheu papel (freelancer/contratante): só permite a
  // escolha e o wizard de criação de perfil de contratante
  if (!user.profile?.papel && !ROTAS_SEM_PAPEL.has(location.pathname)) {
    return <Navigate to="/escolher-papel" replace />;
  }

  // Contas de administração só usam o painel de moderação
  if (user.profile?.papel === PAPEL_ADMIN) {
    return <Navigate to="/moderation-panel" replace />;
  }

  // Rotas exclusivas de um papel (ex.: publicar anúncio é só do contratante)
  if (papel && user.profile?.papel !== papel) {
    return <Navigate to="/" replace />;
  }

  return children;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  papel: PropTypes.oneOf([PAPEL_FREELANCER, PAPEL_CONTRATANTE]),
};
