import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Send, MessageSquare, Lock, HelpCircle, Loader2, ArrowLeft, Archive, MessagesSquare } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import ReportModal from '../components/ModalDenuncia';

const API = 'http://localhost:8000';
const WS_BASE = API.replace(/^http/, 'ws');

const STATUS_CHIP = {
  'Pendente Pagamento': { label: 'Aguardando pagamento', tone: 'warning' },
  'Ativo': { label: 'Em andamento', tone: 'ativo' },
  'Concluído': { label: 'Concluído', tone: 'done' },
  'Cancelado': { label: 'Cancelado', tone: 'cancelled' },
};

const PAPEL_LABEL = {
  freelancer: 'Freelancer',
  contratante: 'Contratante',
};

function formatarHorario(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarData(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function rotuloData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (mesmoDia(d, hoje)) return 'Hoje';
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(d, ontem)) return 'Ontem';
  return formatarData(iso);
}

function formatarValor(valor, unidade) {
  if (valor == null) return '';
  try {
    const brl = Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (unidade && unidade !== 'Integral') return `${brl} (${unidade})`;
    return brl;
  } catch {
    return `R$ ${valor}`;
  }
}

function diaDaMensagem(iso) {
  if (!iso) return '';
  return rotuloData(iso);
}

function inicial(nome) {
  return (nome || '?').trim().charAt(0).toUpperCase();
}

function Avatar({ nome, foto, tamanho = 42 }) {
  if (foto) {
    return (
      <img
        src={foto}
        alt={nome}
        style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        background: 'var(--primary-gradient)',
        color: 'var(--role-contrast)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: tamanho * 0.38,
        flexShrink: 0,
        textTransform: 'uppercase',
      }}
    >
      {inicial(nome)}
    </div>
  );
}

Avatar.propTypes = {
  nome: PropTypes.string,
  foto: PropTypes.string,
  tamanho: PropTypes.number,
};

export default function Conversa() {
  const { user, token } = useAuth();
  const { acordoId } = useParams();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [texto, setTexto] = useState('');
  const [carregandoChats, setCarregandoChats] = useState(true);
  const [carregandoChat, setCarregandoChat] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [chatTab, setChatTab] = useState('em-andamento');
  const [modalDenuncia, setModalDenuncia] = useState(false);
  const [wsId, setWsId] = useState(null);

  const selectedIdRef = useRef(null);
  const inicializadoRef = useRef(false);
  const fimRef = useRef(null);
  const wsRef = useRef(null);
  const enviandoRef = useRef(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Token ${token}` }),
    [token],
  );

  const carregarChats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/chat/`, { headers: authHeaders() });
      if (res.ok) {
        setChats(await res.json());
      }
    } catch {
      // silencioso: o polling tenta de novo
    } finally {
      setCarregandoChats(false);
    }
  }, [token, authHeaders]);

  const abrirChat = useCallback(
    async (id) => {
      selectedIdRef.current = id;
      setWsId(id);
      setCarregandoChat(true);
      setErro('');
      try {
        const res = await fetch(`${API}/api/chat/${id}/`, { headers: authHeaders() });
        if (!res.ok) {
          const dados = await res.json().catch(() => ({}));
          throw new Error(dados.error || 'Não foi possível carregar a conversa.');
        }
        const dados = await res.json();
        setChat(dados);
        setMessages(dados.messages || []);
        if (!dados.chat_ativo) setChatTab('finalizadas');
        fetch(`${API}/api/chat/${id}/ler/`, {
          method: 'POST',
          headers: authHeaders(),
        }).catch(() => {});
        carregarChats();
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregandoChat(false);
      }
    },
    [authHeaders, carregarChats],
  );

  useEffect(() => {
    carregarChats();
  }, [carregarChats]);

  useEffect(() => {
    if (inicializadoRef.current) return;
    if (acordoId) {
      inicializadoRef.current = true;
      abrirChat(acordoId);
    }
  }, [acordoId, abrirChat]);

  const wsConectadoRef = useRef(false);

  // WebSocket em tempo real: entrega imediata de novas mensagens.
  useEffect(() => {
    const idAtual = wsId;
    if (!idAtual || !token) return undefined;

    if (wsRef.current) wsRef.current.close();
    wsRef.current = null;
    wsConectadoRef.current = false;

    let fechado = false;
    let socket = null;
    let retryTimer = null;

    const abrir = () => {
      if (fechado || !wsId) return;
      try {
        socket = new WebSocket(`${WS_BASE}/ws/chat/${wsId}/?token=${encodeURIComponent(token)}`);
      } catch {
        return;
      }
      socket.onopen = () => {
        if (!fechado) {
          wsConectadoRef.current = true;
          // Marca como lido ao conectar e avisa o servidor.
          fetch(`${API}/api/chat/${wsId}/ler/`, {
            method: 'POST',
            headers: authHeaders(),
          }).catch(() => {});
        }
      };
      socket.onmessage = (evt) => {
        if (fechado) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.tipo === 'nova_mensagem' && msg.mensagem) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.mensagem.id) ? prev : [...prev, msg.mensagem],
            );
            setChat((prev) => (prev ? { ...prev, chat_ativo: true } : prev));
            carregarChats();
          }
        } catch {
          // ignora mensagens inválidas
        }
      };
      socket.onclose = () => {
        wsConectadoRef.current = false;
        if (!fechado) {
          // Reconecta com backoff simples.
          retryTimer = setTimeout(abrir, 5000);
        }
      };
      socket.onerror = () => {
        try {
          socket?.close();
        } catch {
          /* noop */
        }
      };
    };

    abrir();
    return () => {
      fechado = true;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        socket?.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
      wsConectadoRef.current = false;
    };
  }, [token, authHeaders, carregarChats, wsId]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      const idAtual = selectedIdRef.current;
      // Se o WebSocket estiver conectado, o fallback de mensagens fica mais raro.
      if (idAtual && token && !wsConectadoRef.current) {
        fetch(`${API}/api/chat/${idAtual}/`, { headers: authHeaders() })
          .then((res) => (res.ok ? res.json() : null))
          .then((dados) => {
            if (!dados) return;
            setMessages((prev) => {
              const anterior = prev.length ? prev[prev.length - 1].id : null;
              const nova = dados.messages?.length
                ? dados.messages[dados.messages.length - 1].id
                : null;
              return anterior === nova ? prev : (dados.messages || []);
            });
            setChat((prev) =>
              prev
                ? {
                    ...prev,
                    status_acordo: dados.status_acordo,
                    chat_ativo: dados.chat_ativo,
                  }
                : prev,
            );
            if (selectedIdRef.current && !dados.chat_ativo) setChatTab('finalizadas');
          })
          .catch(() => {});
      }
      carregarChats();
    }, wsConectadoRef.current ? 10000 : 3000);
    return () => clearInterval(intervalo);
  }, [token, authHeaders, carregarChats]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const enviar = async (e) => {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || !chat?.chat_ativo || enviando || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`${API}/api/chat/${chat.id}/messages/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ texto: conteudo }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(dados.error || 'Não foi possível enviar a mensagem.');
        return;
      }
      setMessages((prev) => (prev.some((m) => m.id === dados.id) ? prev : [...prev, dados]));
      setTexto('');
      carregarChats();
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const chip = chat ? STATUS_CHIP[chat.status_acordo] || { label: chat.status_acordo, tone: 'done' } : null;
  const outraParte = chat?.outra_parte;

  const chatsEmAndamento = chats.filter((c) => c.chat_ativo);
  const chatsFinalizados = chats.filter((c) => !c.chat_ativo);
  const chatsFiltrados = chatTab === 'em-andamento' ? chatsEmAndamento : chatsFinalizados;

  return (
    <div className={`chat-layout ${chat ? 'chat-selecionado' : ''}`}>
      {/* Sidebar — conversas (acordos) do usuário */}
      <aside className="card" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Conversas</h2>
          <span className="badge">{chats.length}</span>
        </div>

        {chats.length > 0 && (
          <div className="chat-tabs" role="tablist" aria-label="Filtrar conversas por status">
            <button
              type="button"
              className={`chat-tab ${chatTab === 'em-andamento' ? 'chat-tab--active' : ''}`}
              onClick={() => setChatTab('em-andamento')}
              title="Em andamento"
              aria-label="Em andamento"
            >
              <MessagesSquare size={17} />
              <span className="chat-tab__count">{chatsEmAndamento.length}</span>
            </button>
            <button
              type="button"
              className={`chat-tab ${chatTab === 'finalizadas' ? 'chat-tab--active' : ''}`}
              onClick={() => setChatTab('finalizadas')}
              title="Finalizadas"
              aria-label="Finalizadas"
            >
              <Archive size={17} />
              <span className="chat-tab__count">{chatsFinalizados.length}</span>
            </button>
          </div>
        )}

        {carregandoChats && chats.length === 0 ? (
          <div className="chat-empty-state">
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Carregando conversas...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="chat-empty-state">
            <MessageSquare size={40} style={{ color: 'var(--border-color)' }} />
            <h3 style={{ fontSize: '1rem' }}>Nenhuma conversa ainda</h3>
            <p style={{ fontSize: '0.9rem' }}>
              O chat é criado automaticamente quando um acordo de serviço é aprovado
              entre você e a outra parte.
            </p>
            <Link to="/" className="btn dark-text" style={{ marginTop: '0.5rem' }}>
              Navegar por anúncios
            </Link>
          </div>
        ) : chatsFiltrados.length === 0 ? (
          <div className="chat-empty-state">
            <Archive size={36} style={{ color: 'var(--border-color)' }} />
            <h3 style={{ fontSize: '0.95rem' }}>
              {chatTab === 'em-andamento' ? 'Nenhuma conversa em andamento' : 'Nenhuma conversa finalizada'}
            </h3>
            <p style={{ fontSize: '0.85rem' }}>
              {chatTab === 'em-andamento'
                ? 'Suas conversas ativas aparecerão aqui.'
                : 'Conversas de acordos concluídos ou cancelados aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="chat-contacts chat-contacts-scroll">
            {chatsFiltrados.map((item) => {
              const ativo = item.id === chat?.id;
              const chipItem = STATUS_CHIP[item.status_acordo] || { label: item.status_acordo, tone: 'done' };
              const ultima = item.ultima_mensagem;
              const papel = item.outra_parte?.papel;
              const horarioUltima = ultima
                ? (mesmoDia(new Date(ultima.criado_em), new Date())
                    ? formatarHorario(ultima.criado_em)
                    : formatarData(ultima.criado_em))
                : '';
              return (
                <Link
                  key={item.id}
                  to={`/chat/${item.id}`}
                  onClick={() => abrirChat(item.id)}
                  className={`chat-contact-item ${ativo ? 'ativo' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  <Avatar nome={item.outra_parte?.nome} foto={item.outra_parte?.foto_perfil} tamanho={40} />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <strong style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.outra_parte?.nome || 'Participante'}
                      </strong>
                      {papel && <span className="chat-papel-tag">{PAPEL_LABEL[papel] || papel}</span>}
                      {horarioUltima && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.6, flexShrink: 0 }}>
                          {horarioUltima}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.titulo_anuncio}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', minWidth: 0, overflow: 'hidden' }}>
                      <span className={`chat-status-chip ${chipItem.tone}`}>{chipItem.label}</span>
                      {ultima && (
                        <span style={{ flex: 1, minWidth: 0, fontSize: '0.72rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ultima.remetente_id === user?.id ? 'Você: ' : ''}
                          {ultima.texto}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.nao_lidas > 0 && (
                    <span className="chat-unread-badge">{item.nao_lidas}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </aside>

      {/* Área principal do chat */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: '100%', minHeight: '400px' }}>
        {!chat ? (
          <div className="chat-empty-state">
            <MessageSquare size={48} style={{ color: 'var(--border-color)' }} />
            <h3>{chats.length ? 'Selecione uma conversa' : 'Bem-vindo ao chat!'}</h3>
            <p style={{ maxWidth: '380px', fontSize: '0.9rem' }}>
              Aqui você conversa apenas com o freelancer ou contratante do seu acordo.
              As mensagens só podem ser trocadas enquanto o acordo estiver em andamento.
            </p>
          </div>
        ) : (
          <>
            {/* Header do chat */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: 'var(--border-width) solid var(--border-color)', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setChat(null); setMessages([]); selectedIdRef.current = null; setWsId(null); navigate('/chat'); }}
                className="chat-back-btn"
                title="Voltar para as conversas"
                aria-label="Voltar para as conversas"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar nome={outraParte?.nome} foto={outraParte?.foto_perfil} tamanho={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {outraParte?.nome || 'Participante'}
                  {outraParte?.papel && <span className="chat-papel-tag">{PAPEL_LABEL[outraParte.papel] || outraParte.papel}</span>}
                  {chip && <span className={`chat-status-chip ${chip.tone}`}>{chip.label}</span>}
                </h3>
                <div className="chat-header-sub">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.titulo_anuncio}
                  </span>
                  {chat.valor_acordado != null && (
                    <span style={{ fontWeight: 600 }}>
                      · {formatarValor(chat.valor_acordado, chat.unidade_valor)}
                    </span>
                  )}
                  {chat.data_confirmacao && (
                    <span>· Iniciado em {formatarData(chat.data_confirmacao)}</span>
                  )}
                </div>
              </div>

              {outraParte && (
                <>
                  <button
                    onClick={() => setModalDenuncia(true)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Denunciar usuário"
                  >
                    <HelpCircle size={24} color="var(--danger-color)" />
                  </button>
                  <Link
                    to={`/user/${outraParte.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Ver Perfil
                  </Link>
                </>
              )}
            </div>

            {/* Aviso de chat encerrado */}
            {!chat.chat_ativo && (
              <div className="chat-banner-encerrado">
                <Lock size={16} />
                <span>
                  Este chat foi encerrado porque o acordo está{' '}
                  {chat.status_acordo === 'Concluído' ? 'concluído' : 'cancelado'}.
                  Você pode ver o histórico, mas não é mais possível enviar mensagens.
                </span>
              </div>
            )}

            {/* Mensagens */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'var(--bg-color)', minHeight: '280px' }}>
              {carregandoChat && messages.length === 0 ? (
                <div className="chat-empty-state">
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>Carregando conversa...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-state">
                  <MessageSquare size={40} style={{ color: 'var(--border-color)' }} />
                  <p>Nenhuma mensagem ainda. Dê o primeiro passo!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const eu = msg.remetente_id === user?.id;
                  const anterior = index > 0 ? messages[index - 1] : null;
                  const novoDia = !anterior || diaDaMensagem(msg.criado_em) !== diaDaMensagem(anterior.criado_em);
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {novoDia && <span className="chat-mensagem-dia">{diaDaMensagem(msg.criado_em)}</span>}
                      <div style={{ display: 'flex', gap: '0.6rem', alignSelf: eu ? 'flex-end' : 'flex-start', maxWidth: '85%', flexDirection: eu ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                        {!eu && <Avatar nome={msg.remetente_nome} tamanho={30} />}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: eu ? 'flex-end' : 'flex-start' }}>
                          <div
                            style={{
                              padding: '0.7rem 1rem',
                              background: eu ? 'var(--primary)' : 'var(--surface-color)',
                              color: eu ? 'var(--role-contrast)' : 'var(--text-color)',
                              border: eu ? 'none' : '1px solid var(--border-color)',
                              borderRadius: '14px',
                              borderBottomRightRadius: eu ? '4px' : '14px',
                              borderBottomLeftRadius: eu ? '14px' : '4px',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                              boxShadow: '0 1px 3px var(--shadow-color)',
                            }}
                          >
                            {msg.texto}
                          </div>
                          <span style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.15rem' }}>
                            {msg.remetente_nome} · {formatarHorario(msg.criado_em)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={fimRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={enviar}
              style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderTop: 'var(--border-width) solid var(--border-color)', background: 'var(--surface-color)', gap: '0.75rem' }}
            >
              {chat.chat_ativo ? (
                <>
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    maxLength={2000}
                    style={{ flex: 1, padding: '0.9rem 1.25rem', fontSize: '0.95rem', border: '1px solid var(--border-color)', borderRadius: '24px', background: 'var(--bg-color)', color: 'var(--text-color)', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={enviando || !texto.trim()}
                    title="Enviar"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: 'var(--primary)', color: 'var(--role-contrast)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, opacity: enviando || !texto.trim() ? 0.5 : 1 }}
                  >
                    {enviando ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
                  </button>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.25rem', borderRadius: '24px', background: 'var(--bg-color)', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Lock size={16} />
                  Chat encerrado — somente leitura
                </div>
              )}
            </form>
          </>
        )}
      </div>

      <ReportModal
        isOpen={modalDenuncia}
        onClose={() => setModalDenuncia(false)}
        targetId={outraParte ? String(outraParte.id) : ''}
        targetName={outraParte?.nome || ''}
        type="user"
      />

      {erro && (
        <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--danger-color)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px', zIndex: 1000, boxShadow: '0 6px 20px rgba(0,0,0,0.2)' }}>
          {erro}
        </div>
      )}
    </div>
  );
}
