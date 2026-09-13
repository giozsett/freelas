import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './ContextoAutenticacao';

const API = 'http://localhost:8000';
const WS_BASE = API.replace(/^http/, 'ws');

const NotificacaoContext = createContext();

export const NotificacaoProvider = ({ children }) => {
  const { token } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);
  const [porTipo, setPorTipo] = useState({});
  const [notificacoes, setNotificacoes] = useState([]);
  const [chatNaoLidas, setChatNaoLidas] = useState(0);

  // Aplica um snapshot enviado pelo servidor (conexão inicial ou reconexão).
  const aplicarSnapshot = useCallback((dados) => {
    if (typeof dados.naoLidas === 'number') setNaoLidas(dados.naoLidas);
    if (dados.tipos) setPorTipo(dados.tipos);
    if (typeof dados.chatNaoLidas === 'number') setChatNaoLidas(dados.chatNaoLidas);
  }, []);

  // Sincronização manual (um-shot) — mantida para uso externo pontual.
  // O estado normal é mantido pelo WebSocket, sem polling.
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

  // WebSocket único para notificações e chat: entrega instantânea,
  // com reconexão automática (o servidor reenvia o snapshot ao conectar).
  const wsRef = useRef(null);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setNaoLidas(0);
      setPorTipo({});
      setChatNaoLidas(0);
      setNotificacoes([]);
      return undefined;
    }

    let fechado = false;

    const abrir = () => {
      if (fechado || !token) return;
      try {
        wsRef.current = new WebSocket(`${WS_BASE}/ws/notificacoes/?token=${encodeURIComponent(token)}`);
      } catch {
        return;
      }

      wsRef.current.onmessage = (evt) => {
        if (fechado) return;
        let dados;
        try {
          dados = JSON.parse(evt.data);
        } catch {
          return;
        }
        switch (dados.tipo) {
          case 'sincronizacao':
            aplicarSnapshot(dados);
            break;
          case 'nova_notificacao':
            aplicarSnapshot(dados);
            if (dados.notificacao?.id) {
              setNotificacoes((atual) =>
                atual.some((n) => n.id === dados.notificacao.id)
                  ? atual
                  : [dados.notificacao, ...atual],
              );
            }
            break;
          case 'chat_nao_lidas':
            if (typeof dados.total === 'number') setChatNaoLidas(dados.total);
            break;
          default:
            break;
        }
      };

      wsRef.current.onclose = () => {
        if (!fechado) {
          // Reconecta com backoff simples; ao reconectar o servidor reenvia o snapshot.
          retryTimerRef.current = setTimeout(abrir, 5000);
        }
      };

      wsRef.current.onerror = () => {
        try {
          wsRef.current?.close();
        } catch {
          /* noop */
        }
      };
    };

    abrir();
    return () => {
      fechado = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [token, aplicarSnapshot]);

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