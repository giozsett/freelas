import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './ContextoAutenticacao';

const API = 'http://localhost:8000';

const NotificacaoContext = createContext();

export const NotificacaoProvider = ({ children }) => {
  const { token } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);
  const [porTipo, setPorTipo] = useState({});
  const [notificacoes, setNotificacoes] = useState([]);
  const [chatNaoLidas, setChatNaoLidas] = useState(0);

  const carregar = useCallback(async () => {
    if (!token) {
      setNaoLidas(0);
      setPorTipo({});
      setChatNaoLidas(0);
      return;
    }
    try {
      const [resNotif, resChat] = await Promise.all([
        fetch(`${API}/api/notificacoes/nao-lidas/`, {
          headers: { Authorization: `Token ${token}` },
        }),
        fetch(`${API}/api/chat/nao-lidas/`, {
          headers: { Authorization: `Token ${token}` },
        }),
      ]);
      if (resNotif.ok) {
        const data = await resNotif.json();
        setNaoLidas(data.count || 0);
        setPorTipo(data.tipos || {});
      }
      if (resChat.ok) {
        const data = await resChat.json();
        if (typeof data.total === 'number') setChatNaoLidas(data.total);
      }
    } catch {
      // servidor offline: mantém o estado atual
    }
  }, [token]);

  const carregarLista = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notificacoes/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) return;
      setNotificacoes(await res.json());
    } catch {
      // silencioso
    }
  }, [token]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 8000);
    return () => clearInterval(id);
  }, [carregar]);

  const marcarLidas = useCallback(async (tipos = []) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/notificacoes/ler-todas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ tipos: tipos.length ? tipos : undefined }),
      });
      if (!res.ok) throw new Error('Não foi possível marcar as notificações como lidas.');

      const data = await res.json();
      if (tipos.length) {
        setNaoLidas((atual) => Math.max(0, atual - (data.count || 0)));
        setPorTipo((atual) => {
          const novo = { ...atual };
          tipos.forEach((tipo) => { delete novo[tipo]; });
          return novo;
        });
      } else {
        setNaoLidas(0);
        setPorTipo({});
      }
    } catch {
      carregar();
    }
  }, [token, carregar]);

  return (
    <NotificacaoContext.Provider
      value={{
        naoLidas,
        porTipo,
        notificacoes,
        chatNaoLidas,
        carregar,
        carregarLista,
        marcarLidas,
      }}
    >
      {children}
    </NotificacaoContext.Provider>
  );
};

export const useNotificacoes = () => useContext(NotificacaoContext);

NotificacaoProvider.propTypes = {
  children: PropTypes.node,
};
