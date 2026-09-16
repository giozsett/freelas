import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';

// Gate de ações (candidatura, denúncia, etc.) para usuários deslogados: em
// vez de bloquear a página inteira (como RotaPrivada faz com rotas), redireciona
// para o login só quando o usuário tenta executar algo que exige conta,
// preservando a página de origem para retomar depois do login.
export default function useExigirAutenticacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback((acao) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    acao();
  }, [user, navigate, location]);
}
