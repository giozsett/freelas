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

  const carregar = useCallback(async () => {
    if (!token) {
      setNaoLidas(0);
      setPorTipo({});
      return;
    }
    try {
      const res = await fetch(`${API}/api/notificacoes/nao-lidas/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNaoLidas(data.count || 0);
      setPorTipo(data.tipos || {});
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
    const id = setInterval(carregar, 10000);
    return () => clearInterval(id);
  }, [carregar]);

  const marcarLidas = useCallback(async (tipos = []) => {
    if (!token) return;
    const alvos = tipos.length ? tipos : Object.keys(porTipo);
    const subtotal = alvos.reduce((soma, t) => soma + (porTipo[t] || 0), 0);
    setNaoLidas((atual) => Math.max(0, atual - subtotal));
    setPorTipo((atual) => {
      const novo = { ...atual };
      alvos.forEach((t) => { delete novo[t]; });
      return novo;
    });
    try {
      await fetch(`${API}/api/notificacoes/ler-todas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ tipos: tipos.length ? tipos : undefined }),
      });
    } catch {
      carregar();
    }
  }, [token, porTipo, carregar]);

  return (
    <NotificacaoContext.Provider
      value={{
        naoLidas,
        porTipo,
        notificacoes,
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
