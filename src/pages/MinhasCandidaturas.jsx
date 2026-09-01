import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  ArrowRight,
  Check,
  Archive,
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useNotificacoes } from '../context/ContextoNotificacao';

const STATUS_CONFIG = {
  aprovada: {
    badgeBg: 'var(--success-soft)',
    badgeColor: 'var(--success-color)',
    label: 'Aprovada',
    icon: CheckCircle,
    sideColor: 'var(--success-color)',
    description: 'Sua proposta foi aceita. Acompanhe o acordo em Meus freelas.',
  },
  pendente: {
    badgeBg: 'var(--secondary)',
    badgeColor: 'var(--primary)',
    label: 'Em análise',
    icon: Clock,
    sideColor: 'var(--primary)',
    description: 'O anunciante ainda está avaliando as candidaturas.',
  },
  recusada: {
    badgeBg: 'var(--danger-soft)',
    badgeColor: 'var(--danger-color)',
    label: 'Recusada',
    icon: XCircle,
    sideColor: 'var(--danger-color)',
    description: 'O anunciante escolheu outra proposta.',
  },
};

const EXPIRADA_MOTIVO = 'Anúncio expirado.';

function isExpirada(app) {
  return app.indisponivel === true && app.motivo_indisponibilidade === EXPIRADA_MOTIVO;
}

function getStatusInfo(app) {
  if (isExpirada(app)) {
    return {
      badgeBg: 'var(--pending-card)',
      badgeColor: 'var(--text-secondary)',
      label: 'Anúncio expirado',
      icon: Archive,
      sideColor: 'var(--pending-accent)',
      description: 'O prazo do anúncio terminou antes da seleção da sua proposta.',
    };
  }
  if (app.indisponivel || app.status === 'encerrada') {
    return {
      badgeBg: 'var(--pending-card)',
      badgeColor: 'var(--text-secondary)',
      label: 'Encerrada',
      icon: AlertCircle,
      sideColor: 'var(--pending-accent)',
      description: 'Este processo foi encerrado porque outra proposta já foi aprovada.',
    };
  }
  return STATUS_CONFIG[app.status] || STATUS_CONFIG.pendente;
}

// Candidaturas finalizadas: recusadas, aprovadas, expiradas (anúncio vencido) e encerradas.
function isFinalizada(app) {
  return (
    app.status === 'aprovada' ||
    app.status === 'recusada' ||
    app.status === 'encerrada' ||
    isExpirada(app)
  );
}

/* eslint-disable react/prop-types */
function StatusBadge({ status }) {
  const [open, setOpen] = useState(false);
  const StatusIcon = status.icon;
  return (
    <span className="mc-status">
      <span
        className="badge"
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-label={`${status.label}. ${status.description}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          background: status.badgeBg,
          color: status.badgeColor,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <StatusIcon size={14} />
        {status.label}
      </span>
      {open && (
        <span className="mc-tooltip" role="tooltip">
          <StatusIcon size={14} />
          {status.description}
        </span>
      )}
    </span>
  );
}

export default function MinhasCandidaturas() {
  const { user } = useAuth();
  const { marcarLidas } = useNotificacoes();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('em-andamento');

  useEffect(() => {
    marcarLidas(['candidatura']);
  }, [marcarLidas]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    fetch(`http://localhost:8000/api/candidaturas/?user_id=${user.id}`, {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setApplications(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [user]);

  const emAndamento = applications.filter((app) => !isFinalizada(app));
  const finalizadas = applications.filter(isFinalizada);

  const pendentes = emAndamento.filter((a) => a.status === 'pendente');
  const aprovadas = applications.filter((a) => a.status === 'aprovada');
  const naoSelecionadas = applications.filter(
    (a) => a.status === 'recusada' || a.status === 'encerrada' || isExpirada(a)
  );

  const visibleApplications = activeTab === 'em-andamento' ? emAndamento : finalizadas;

  return (
    <div className="mf-page-header-wrapper" style={{ maxWidth: '900px', margin: '2rem auto' }}>
      {/* ── Cabeçalho padronizado ── */}
      <div className="mf-page-header">
        <div className="mf-page-header__main">
          <div className="mf-page-header__icon">
            <Send size={28} />
          </div>
          <div>
            <h1>Minhas Candidaturas</h1>
            <p className="mf-page-header__desc">
              Confira o histórico das suas propostas enviadas e acompanhe os resultados.
            </p>
          </div>
        </div>
      </div>

      {/* ── Barra de resumo ── */}
      {applications.length > 0 && (
        <div className="mf-summary">
          <div className="mf-summary__item">
            <div className="mf-summary__icon">
              <Clock size={20} />
            </div>
            <div>
              <div className="mf-summary__value">{pendentes.length}</div>
              <div className="mf-summary__label">Em análise</div>
            </div>
          </div>
          <div className="mf-summary__item">
            <div className="mf-summary__icon mf-summary__icon--success">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="mf-summary__value">{aprovadas.length}</div>
              <div className="mf-summary__label">Aprovadas</div>
            </div>
          </div>
          <div className="mf-summary__item">
            <div className="mf-summary__icon mf-summary__icon--danger">
              <XCircle size={20} />
            </div>
            <div>
              <div className="mf-summary__value">{naoSelecionadas.length}</div>
              <div className="mf-summary__label">Não selecionadas</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Abas segmentadas ── */}
      {applications.length > 0 && (
        <div className="mf-tabs" role="tablist" aria-label="Filtrar candidaturas">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'em-andamento'}
            className={`mf-tab ${activeTab === 'em-andamento' ? 'mf-tab--active' : ''}`}
            onClick={() => setActiveTab('em-andamento')}
          >
            <Clock size={16} />
            Em andamento
            <span className="mf-tab__count">{emAndamento.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'finalizadas'}
            className={`mf-tab ${activeTab === 'finalizadas' ? 'mf-tab--active' : ''}`}
            onClick={() => setActiveTab('finalizadas')}
          >
            <Check size={16} />
            Finalizadas
            <span className="mf-tab__count">{finalizadas.length}</span>
          </button>
        </div>
      )}

      {/* ── Lista de candidaturas ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Carregando candidaturas...
        </div>
      ) : visibleApplications.length > 0 ? (
        <div className="mc-list" key={activeTab}>
          {visibleApplications.map((app, index) => {
            const status = getStatusInfo(app);
            const isUnavailable = app.indisponivel || app.status === 'encerrada';

            return (
              <div
                key={app.id}
                className="mf-card mc-card-enter"
                style={{
                  borderLeftColor: status.sideColor,
                  marginBottom: '1rem',
                  animationDelay: `${Math.min(index * 60, 360)}ms`,
                }}
              >
                <div className="mf-card__summary" style={{ cursor: 'default' }}>
                  <div style={{ flex: '1 1 0', minWidth: 0 }}>
                    <div className="mf-card__badges">
                      <StatusBadge status={status} />
                    </div>

                    <h3 className="mf-card__title">
                      <Link
                        to={`/ad/${app.anuncio_id}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                        onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                      >
                        {app.ad_title}
                      </Link>
                    </h3>

                    <div className="mf-card__meta">
                      <span>
                        <Clock size={15} />
                        Enviada em {new Date(app.enviado_em).toLocaleDateString()}
                      </span>
                      {app.categoria && (
                        <span>
                          <strong>{app.categoria}</strong>
                        </span>
                      )}
                    </div>

                    {isUnavailable && !isExpirada(app) && (
                      <p
                        style={{
                          margin: '0.5rem 0 0',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {app.motivo_indisponibilidade || 'O autor já aprovou outra candidatura para este anúncio.'}
                      </p>
                    )}
                  </div>

                  {/* ── Ações por estado ── */}
                  <div className="mf-card__actions" style={{ minWidth: '160px', flexShrink: 0 }}>
                    {isUnavailable ? (
                      <Link
                        to={`/ad/${app.anuncio_id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
                      >
                        <Eye size={16} />
                        Ver detalhes
                      </Link>
                    ) : app.status === 'aprovada' ? (
                      <Link
                        to={app.acordo_id ? `/chat/${app.acordo_id}` : '/chat'}
                        className="btn"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
                      >
                        <ArrowRight size={16} />
                        Ir para o freela
                      </Link>
                    ) : app.status === 'recusada' ? (
                      <Link
                        to={`/ad/${app.anuncio_id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
                      >
                        <Eye size={16} />
                        Ver detalhes
                      </Link>
                    ) : (
                      <Link
                        to={`/ad/${app.anuncio_id}`}
                        className="btn"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
                      >
                        <Eye size={16} />
                        Ver anúncio
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : applications.length === 0 ? (
        <div className="mf-empty">
          <div className="mf-empty__icon">
            <Send size={28} />
          </div>
          <h3>Você ainda não se candidatou a nenhum anúncio.</h3>
          <p>Encontre oportunidades e comece a enviar suas propostas.</p>
          <Link to="/" className="btn">
            Procurar vagas e serviços
          </Link>
        </div>
      ) : (
        <div className="mf-empty">
          <div className="mf-empty__icon">
            {activeTab === 'em-andamento' ? <Clock size={28} /> : <Check size={28} />}
          </div>
          <h3>
            {activeTab === 'em-andamento'
              ? 'Nenhuma candidatura em andamento.'
              : 'Nenhuma candidatura finalizada.'}
          </h3>
          <p>
            {activeTab === 'em-andamento'
              ? 'Suas candidaturas pendentes aparecerão aqui.'
              : 'Candidaturas aprovadas, recusadas ou com anúncio vencido aparecerão aqui.'}
          </p>
        </div>
      )}
    </div>
  );
}
