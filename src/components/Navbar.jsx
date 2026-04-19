import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, Bell, MessageSquare, UserCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { role, toggleRole } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Mocking notifications for demonstration
  const [hasNewMessages] = useState(true);
  const [hasNewApplications] = useState(true);

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
              {hasNewMessages && <div className="notification-dot"></div>}
            </Link>

            {/* Profile Dropdown */}
            <div className="dropdown" ref={dropdownRef}>
              <div
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-color)', position: 'relative' }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Opções de Perfil"
              >
                <UserCircle size={28} />
                {hasNewApplications && <div className="notification-dot"></div>}
              </div>
              <div className="dropdown-content" style={{ display: dropdownOpen ? 'block' : 'none' }}>
                <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Meu Perfil</Link>
                <Link to="/profile/edit" className="dropdown-item" onClick={() => setDropdownOpen(false)}>Editar Perfil</Link>
                <Link to="/my-ads" className="dropdown-item" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Meus Anúncios
                  {hasNewApplications && role === 'contractor' && <div className="notification-dot" style={{ position: 'static' }}></div>}
                </Link>
                <Link to="/my-applications" className="dropdown-item" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Minhas Candidaturas
                  {hasNewApplications && role === 'freelancer' && <div className="notification-dot" style={{ position: 'static' }}></div>}
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
