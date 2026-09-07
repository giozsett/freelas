import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sun,
  Moon,
  Bell,
  MessageSquare,
  Menu,
  X,
  Briefcase,
  HandCoins,
  FileText,
  ClipboardCheck,
  Star,
  CreditCard,
  Wallet,
  LogOut,
  Settings,
  UserRound,
  Plus,
} from 'lucide-react';
import { useTheme } from '../context/ContextoTema';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useNotificacoes } from '../context/ContextoNotificacao';

const NOTIF_ICON = {
  candidatura: ClipboardCheck,
  acordo: HandCoins,
  avaliacao: Star,
  pagamento: CreditCard,
};

// Pendências de candidatura aparecem em "Meus Anúncios" quando o papel ativo é
// contratante (quem recebe candidaturas) e em "Minhas Candidaturas" quando é
// freelancer (quem se candidatou) — mesma regra da navbar anterior.
function montarSecoesMenu(porTipo, role) {
  return [
    {
      titulo: 'Conta',
      itens: [
        { icon: UserRound, to: '/profile', label: 'Meu perfil', tipos: [] },
        { icon: Settings, to: '/plans', label: 'Planos e assinatura', tipos: [] },
      ],
    },
    {
      titulo: 'Atividade',
      itens: [
        { icon: FileText, to: '/my-ads', label: 'Meus anúncios', tipos: ['candidatura'], count: role === 'contractor' ? porTipo.candidatura || 0 : 0 },
        { icon: ClipboardCheck, to: '/my-applications', label: 'Minhas candidaturas', tipos: ['candidatura'], count: role === 'freelancer' ? porTipo.candidatura || 0 : 0 },
        { icon: HandCoins, to: '/my-freelas', label: 'Meus freelas', tipos: ['acordo'], count: porTipo.acordo || 0 },
        { icon: Star, to: '/my-reviews', label: 'Minhas avaliações', tipos: ['avaliacao'], count: porTipo.avaliacao || 0 },
      ],
    },
    {
      titulo: 'Financeiro',
      itens: [
        { icon: Wallet, to: '/my-payments', label: 'Meus pagamentos', tipos: ['pagamento'], count: porTipo.pagamento || 0 },
      ],
    },
  ];
}

export default function BarraNavegacao() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { role, toggleRole } = useRole();
  const { naoLidas, porTipo, notificacoes, chatNaoLidas, carregarLista, marcarLidas } = useNotificacoes();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerNotifOpen, setDrawerNotifOpen] = useState(false);
  const [pulseChat, setPulseChat] = useState(false);
  const [pulseNotif, setPulseNotif] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const prevChatNaoLidas = useRef(chatNaoLidas);
  const prevNaoLidas = useRef(naoLidas);

  useEffect(() => {
    if (prevChatNaoLidas.current === 0 && chatNaoLidas > 0) {
      setPulseChat(true);
      const timer = setTimeout(() => setPulseChat(false), 400);
      return () => clearTimeout(timer);
    }
    prevChatNaoLidas.current = chatNaoLidas;
  }, [chatNaoLidas]);

  useEffect(() => {
    if (prevNaoLidas.current === 0 && naoLidas > 0) {
      setPulseNotif(true);
      const timer = setTimeout(() => setPulseNotif(false), 400);
      return () => clearTimeout(timer);
    }
    prevNaoLidas.current = naoLidas;
  }, [naoLidas]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = user
    ? (`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || '?').charAt(0).toUpperCase()
    : '?';
  const totalPendencias = naoLidas + chatNaoLidas;

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setDrawerOpen(false);
    navigate('/login');
  };

  const abrirNotificacoes = (abrir) => {
    setNotifOpen(abrir);
    if (abrir) carregarLista();
  };

  const abrirNotificacoesDrawer = () => {
    const abrir = !drawerNotifOpen;
    setDrawerNotifOpen(abrir);
    if (abrir) carregarLista();
  };

  // eslint-disable-next-line react/prop-types -- componente interno, sem contrato de props formal
  const ThemeToggle = ({ className }) => (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      <span className={`fn-theme-icon ${theme === 'light' ? 'is-in' : 'is-out'}`}>
        <Sun size={17} />
      </span>
      <span className={`fn-theme-icon ${theme === 'dark' ? 'is-in' : 'is-out'}`}>
        <Moon size={17} />
      </span>
    </button>
  );

  if (!user) {
    return (
      <nav className="fn-navbar">
        <Link to="/" className="fn-brand">
          <span className="fn-brand__mark">F</span>
          <span className="fn-brand__word">Freelas</span>
        </Link>
        <div className="fn-actions fn-actions--guest">
          <ThemeToggle className="fn-theme-btn" />
          <Link to="/login" className="fn-cta">Entrar</Link>
        </div>
      </nav>
    );
  }

  const menuSecoes = montarSecoesMenu(porTipo, role);

  const RoleSwitch = () => (
    <div className={`fn-segmented fn-segmented--role ${role === 'contractor' ? 'is-second' : ''}`}>
      <span className="fn-segmented__thumb" />
      <button
        type="button"
        className={`fn-segmented__opt ${role === 'freelancer' ? 'is-active' : ''}`}
        onClick={() => role !== 'freelancer' && toggleRole()}
        aria-pressed={role === 'freelancer'}
        title="Freelancer"
      >
        <Briefcase size={14} />
        <span className="fn-segmented__opt-label">Freelancer</span>
      </button>
      <button
        type="button"
        className={`fn-segmented__opt ${role === 'contractor' ? 'is-active' : ''}`}
        onClick={() => role !== 'contractor' && toggleRole()}
        aria-pressed={role === 'contractor'}
        title="Contratante"
      >
        <HandCoins size={14} />
        <span className="fn-segmented__opt-label">Contratante</span>
      </button>
    </div>
  );

  // eslint-disable-next-line react/prop-types -- componente interno, sem contrato de props formal
  const UserMenuContent = ({ onNavigate }) => (
    <>
      <div className="fn-panel__header">
        {user?.profile?.foto_perfil ? (
          <img className="fn-panel__avatar" src={user.profile.foto_perfil} alt="Foto de perfil" />
        ) : (
          <span className="fn-panel__avatar fn-panel__avatar--fallback">{initial}</span>
        )}
        <div className="fn-panel__identity">
          <strong>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}</strong>
          <span className="fn-panel__email">{user.email}</span>
        </div>
        <span className="fn-role-chip">
          {role === 'freelancer' ? <Briefcase size={12} /> : <HandCoins size={12} />}
          {role === 'freelancer' ? 'Freelancer' : 'Contratante'}
        </span>
      </div>

      {menuSecoes.map((secao) => (
        <div className="fn-panel__section" key={secao.titulo}>
          <span className="fn-panel__section-title">{secao.titulo}</span>
          {secao.itens.map(({ icon: Icon, label, to, tipos, count = 0 }) => (
            <Link
              key={label}
              to={to}
              className="fn-panel__item"
              onClick={() => { if (tipos.length) marcarLidas(tipos); onNavigate(); }}
            >
              <span className="fn-panel__item-icon">
                <Icon size={16} />
              </span>
              <span className="fn-panel__item-label">{label}</span>
              {count > 0 && <span className="fn-panel__item-count">{count > 99 ? '99+' : count}</span>}
            </Link>
          ))}
        </div>
      ))}

      <button type="button" className="fn-panel__logout" onClick={() => { handleLogout(); onNavigate(); }}>
        <LogOut size={16} />
        Sair da conta
      </button>
    </>
  );

  // eslint-disable-next-line react/prop-types -- componente interno, sem contrato de props formal
  const NotifPanelContent = ({ onNavigate }) => (
    <>
      <div className="fn-panel__notif-head">
        <strong>Notificações</strong>
        {naoLidas > 0 && (
          <button type="button" className="fn-panel__mark-read" onClick={() => marcarLidas()}>
            Marcar todas como lidas
          </button>
        )}
      </div>
      {notificacoes.length === 0 ? (
        <div className="fn-panel__empty">Nenhuma notificação</div>
      ) : (
        notificacoes.map((n) => {
          const Icon = NOTIF_ICON[n.tipo] || Bell;
          return (
            <Link
              key={n.id}
              to={n.link || '#'}
              className={`fn-panel__notif-item ${n.lida ? '' : 'is-unread'}`}
              onClick={() => { marcarLidas([n.tipo]); onNavigate(); }}
            >
              <span className="fn-panel__item-icon">
                <Icon size={15} />
              </span>
              <span className="fn-panel__notif-text">{n.mensagem}</span>
              {!n.lida && <span className="fn-panel__notif-dot" />}
            </Link>
          );
        })
      )}
    </>
  );

  return (
    <>
      <nav className="fn-navbar">
        <Link to="/" className="fn-brand">
          <span className="fn-brand__mark">F</span>
          <span className="fn-brand__word">Freelas</span>
        </Link>

        {/* ── Controles centrais (papel + tema) — ocultos em telas estreitas ── */}
        <div className="fn-center">
          <RoleSwitch />
          <ThemeToggle className="fn-theme-btn" />
        </div>

        {/* ── Ações à direita — ocultas em telas estreitas em favor do ☰ ── */}
        <div className="fn-actions">
          <Link to="/create-ad" className="fn-cta">
            <Plus size={15} />
            Postar anúncio
          </Link>

          <Link to="/chat" className="fn-icon-btn" title="Mensagens" aria-label="Mensagens">
            <MessageSquare size={19} />
            {chatNaoLidas > 0 && (
              <span className={`fn-badge-dot${pulseChat ? ' fn-badge-dot--pulse' : ''}`}>{chatNaoLidas > 99 ? '99+' : chatNaoLidas}</span>
            )}
          </Link>

          <div className="fn-popover-wrap" ref={notifRef}>
            <button
              type="button"
              className="fn-icon-btn"
              title="Notificações"
              aria-label="Notificações"
              onClick={() => abrirNotificacoes(!notifOpen)}
            >
              <Bell size={19} />
              {naoLidas > 0 && (
                <span className={`fn-badge-dot${pulseNotif ? ' fn-badge-dot--pulse' : ''}`}>{naoLidas > 99 ? '99+' : naoLidas}</span>
              )}
            </button>

            {notifOpen && (
              <div className="fn-panel fn-panel--notif">
                <NotifPanelContent onNavigate={() => setNotifOpen(false)} />
              </div>
            )}
          </div>

          <div className="fn-popover-wrap" ref={userMenuRef}>
            <button
              type="button"
              className="fn-user-trigger"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-label="Menu do usuário"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              {user?.profile?.foto_perfil ? (
                <img src={user.profile.foto_perfil} alt="Foto de perfil" className="fn-avatar" />
              ) : (
                <span className="fn-avatar fn-avatar--fallback">{initial}</span>
              )}
              {naoLidas > 0 && <span className="fn-dot-marker" />}
            </button>

            {userMenuOpen && (
              <div className="fn-panel fn-panel--user" role="menu">
                <span className="fn-panel__caret" aria-hidden="true" />
                <UserMenuContent onNavigate={() => setUserMenuOpen(false)} />
              </div>
            )}
          </div>

          {/* ── Menu sanduíche: em telas estreitas concentra tudo acima ── */}
          <button
            type="button"
            className="fn-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
            {totalPendencias > 0 && <span className="fn-badge-dot fn-badge-dot--hamburger">{totalPendencias > 99 ? '99+' : totalPendencias}</span>}
          </button>
        </div>
      </nav>

      {/* ── Gaveta lateral (versão mobile do menu sanduíche/dropdown) ── */}
      {drawerOpen && (
        <div className="fn-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="fn-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="fn-drawer__top">
              <span className="fn-brand__word">Freelas</span>
              <button type="button" className="fn-icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">
                <X size={20} />
              </button>
            </div>

            <div className="fn-drawer__controls">
              <RoleSwitch />
              <ThemeToggle className="fn-theme-btn" />
            </div>

            <div className="fn-drawer__shortcuts">
              <Link to="/chat" className="fn-drawer__shortcut" title="Mensagens" onClick={() => setDrawerOpen(false)}>
                <MessageSquare size={18} />
                <span className="fn-drawer__shortcut-label">Mensagens</span>
                {chatNaoLidas > 0 && <span className="fn-panel__item-count">{chatNaoLidas > 99 ? '99+' : chatNaoLidas}</span>}
              </Link>
              <button type="button" className="fn-drawer__shortcut" title="Notificações" onClick={abrirNotificacoesDrawer}>
                <Bell size={18} />
                <span className="fn-drawer__shortcut-label">Notificações</span>
                {naoLidas > 0 && <span className="fn-panel__item-count">{naoLidas > 99 ? '99+' : naoLidas}</span>}
              </button>
            </div>

            {drawerNotifOpen && (
              <div className="fn-panel fn-panel--inline">
                <NotifPanelContent onNavigate={() => { setDrawerNotifOpen(false); setDrawerOpen(false); }} />
              </div>
            )}

            <div className="fn-drawer__menu">
              <UserMenuContent onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
