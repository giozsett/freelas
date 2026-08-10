import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ContextoTema';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useNotificacoes } from '../context/ContextoNotificacao';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { role, toggleRole } = useRole();
  const { naoLidas, porTipo, marcarLidas } = useNotificacoes();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const initial = user
    ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '?').charAt(0).toUpperCase()
    : '?';

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
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
            </Link>

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
