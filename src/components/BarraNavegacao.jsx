import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, MessageSquare, Bell } from 'lucide-react';
import { useTheme } from '../context/ContextoTema';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useNotificacoes } from '../context/ContextoNotificacao';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { role, toggleRole } = useRole();
  const { naoLidas, porTipo, notificacoes, chatNaoLidas, carregarLista, marcarLidas } = useNotificacoes();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificacoesRef = useRef(null);
  const navigate = useNavigate();

  const initial = user
    ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '?').charAt(0).toUpperCase()
    : '?';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notificacoesRef.current && !notificacoesRef.current.contains(event.target)) {
        setNotificacoesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">FREELAS</Link>

      <div className="navbar-nav">
        {user ? (
          <>

            <Link to="/create-ad" className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '20px' }}>Postar Anúncio</Link>

            {/* Toggle Switch */}
            <div className="switch-container">
              <label className="switch">
                <input type="checkbox" checked={role === 'contractor'} onChange={toggleRole} />
                <span className="slider-switch">
                  <span className="switch-text freela">Freelancer</span>
                  <span className="switch-text contra">Contratante</span>
                </span>
              </label>
            </div>





            <button
              onClick={toggleTheme}
              title="Alternar Tema"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex', marginRight: 'auto' }}
            >
              {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </button>

            <Link to="/chat" title="Mensagens" aria-label="Mensagens" style={{ color: 'var(--text-color)', display: 'flex', alignItems: 'center', position: 'relative' }}>
              <MessageSquare size={24} />
              {chatNaoLidas > 0 && (
                <span className="notification-dot chat-unread-dot">{chatNaoLidas > 99 ? '99+' : chatNaoLidas}</span>
              )}
            </Link>

            {/* Notification Bell */}
            <div className="dropdown" ref={notificacoesRef}>
              <button
                onClick={() => {
                  const abrir = !notificacoesOpen;
                  setNotificacoesOpen(abrir);
                  if (abrir) carregarLista();
                }}
                title="Notificações"
                aria-label="Notificações"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex', alignItems: 'center', position: 'relative', padding: '0.1rem' }}
              >
                <Bell size={24} />
                {naoLidas > 0 && (
                  <span className="notification-dot chat-unread-dot">{naoLidas > 99 ? '99+' : naoLidas}</span>
                )}
              </button>
              <div className="dropdown-content notif-content" style={{ display: notificacoesOpen ? 'block' : 'none', right: 0, left: 'auto', width: 320, maxHeight: 360, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', borderBottom: 'var(--border-width) solid var(--border-color)' }}>
                  <strong>Notificações</strong>
                  {naoLidas > 0 && (
                    <button
                      onClick={() => marcarLidas()}
                      className="notif-marcar-lidas"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem' }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {notificacoes.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Nenhuma notificação
                  </div>
                ) : (
                  notificacoes.map((n) => (
                    <Link
                      key={n.id}
                      to={n.link || '#'}
                      onClick={() => { setNotificacoesOpen(false); marcarLidas([n.tipo]); }}
                      className="notif-item"
                      style={{ display: 'flex', gap: '0.6rem', padding: '0.6rem 0.9rem', textDecoration: 'none', color: 'var(--text-color)', borderBottom: 'var(--border-width) solid var(--border-color)', background: n.lida ? 'transparent' : 'var(--bg-color)' }}
                    >
                      <span style={{ flex: 1, fontSize: '0.88rem' }}>{n.mensagem}</span>
                      {!n.lida && <span className="notification-dot" style={{ position: 'static', alignSelf: 'center', flexShrink: 0 }}></span>}
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Profile Dropdown */}
            <div className="dropdown" ref={dropdownRef}>
              <div
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-color)', position: 'relative' }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Opções de Perfil"
              >
                {user?.profile?.foto_perfil ? (
                  <img src={user.profile.foto_perfil} alt="Foto" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--holo-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {initial}
                  </span>
                )}
                {naoLidas > 0 && <div className="notification-dot"></div>}
              </div>
              <div className="dropdown-content" style={{ display: dropdownOpen ? 'block' : 'none' }}>
                <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Meu Perfil</Link>
                <Link to="/my-ads" className="dropdown-item" onClick={() => { setDropdownOpen(false); marcarLidas(['candidatura']); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Meus Anúncios
                  {porTipo.candidatura > 0 && role === 'contractor' && <div className="notification-dot" style={{ position: 'static' }}></div>}
                </Link>
                <Link to="/my-applications" className="dropdown-item" onClick={() => { setDropdownOpen(false); marcarLidas(['candidatura']); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Minhas Candidaturas
                  {porTipo.candidatura > 0 && role === 'freelancer' && <div className="notification-dot" style={{ position: 'static' }}></div>}
                </Link>
                <Link to="/my-freelas" className="dropdown-item" onClick={() => { setDropdownOpen(false); marcarLidas(['acordo']); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Meus Freelas
                  {porTipo.acordo > 0 && <div className="notification-dot" style={{ position: 'static' }}></div>}
                </Link>
                <Link to="/my-reviews" className="dropdown-item" onClick={() => { setDropdownOpen(false); marcarLidas(['avaliacao']); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Minhas Avaliações
                  {porTipo.avaliacao > 0 && <div className="notification-dot" style={{ position: 'static' }}></div>}
                </Link>
                <Link to="/my-payments" className="dropdown-item" onClick={() => { setDropdownOpen(false); marcarLidas(['pagamento']); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Meus Pagamentos
                  {porTipo.pagamento > 0 && <div className="notification-dot" style={{ position: 'static' }}></div>}
                </Link>
                <Link to="/plans" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Planos e Assinaturas</Link>
                <button
                  onClick={handleLogout}
                  className="dropdown-item"
                  style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--holo-salmon)' }}
                >
                  Sair
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" style={{ fontWeight: '500' }}>Entrar</Link>
            <button
              onClick={toggleTheme}
              title="Alternar Tema"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)', display: 'flex' }}
            >
              {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
