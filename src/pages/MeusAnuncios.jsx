import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone, CheckCircle, Clock, TimerOff,
  CircleDot, CircleX, Eye, Settings,
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useNotificacoes } from '../context/ContextoNotificacao';

export default function MyAds() {
  const { user } = useAuth();
  const { marcarLidas } = useNotificacoes();
  const [myAds, setMyAds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ativos');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    marcarLidas(['candidatura']);
  }, [marcarLidas]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    fetch('http://localhost:8000/api/ads/?all=true')
      .then(res => res.json())
      .then(data => {
        const userAds = data.filter(ad => ad.author === user.id);
        setMyAds(userAds);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ads', err);
        setIsLoading(false);
      });
  }, [user]);

  const isFinalized = (ad) => String(ad.status_anuncio || '').toLowerCase() === 'finalizado';
  const isExpired = (ad) => String(ad.status_anuncio || '').toLowerCase() === 'vencido';
  const activeAds = myAds.filter(ad => !isFinalized(ad) && !isExpired(ad));
  const finalizedAds = myAds.filter(isFinalized);
  const expiredAds = myAds.filter(isExpired);
  const visibleAds = statusFilter === 'ativos'
    ? activeAds
    : statusFilter === 'finalizados' ? finalizedAds : expiredAds;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      
      {/* Page header */}
      <div className="mf-page-header">
        <div className="mf-page-header__main">
          <div className="mf-page-header__icon">
            <Megaphone size={26} />
          </div>
          <div>
            <h1>Meus Anúncios</h1>
            <p className="mf-page-header__desc">
              Acompanhe os anúncios que você postou, verifique o status de cada um e gerencie as candidaturas recebidas.
            </p>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {myAds.length > 0 && (
        <div className="mf-summary">
          <div className="mf-summary__item">
            <div className="mf-summary__icon mf-summary__icon--muted">
              <CircleDot size={18} />
            </div>
            <div>
              <div className="mf-summary__value">{activeAds.length}</div>
              <div className="mf-summary__label">Ativos</div>
            </div>
          </div>
          <div className="mf-summary__item">
            <div className="mf-summary__icon mf-summary__icon--success">
              <CheckCircle size={18} />
            </div>
            <div>
              <div className="mf-summary__value">{finalizedAds.length}</div>
              <div className="mf-summary__label">Finalizados</div>
            </div>
          </div>
          <div className="mf-summary__item">
            <div className="mf-summary__icon mf-summary__icon--danger">
              <CircleX size={18} />
            </div>
            <div>
              <div className="mf-summary__value">{expiredAds.length}</div>
              <div className="mf-summary__label">Vencidos</div>
            </div>
          </div>
        </div>
      )}

      {/* Segmented tabs */}
      {myAds.length > 0 && (
        <div className="mf-tabs" role="tablist" aria-label="Filtrar anúncios por status">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'ativos'}
            className={`mf-tab ${statusFilter === 'ativos' ? 'mf-tab--active' : ''}`}
            onClick={() => setStatusFilter('ativos')}
          >
            <Clock size={16} />
            Em andamento
            <span className="mf-tab__count">{activeAds.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'finalizados'}
            className={`mf-tab ${statusFilter === 'finalizados' ? 'mf-tab--active' : ''}`}
            onClick={() => setStatusFilter('finalizados')}
          >
            <CheckCircle size={16} />
            Finalizados
            <span className="mf-tab__count">{finalizedAds.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'vencidos'}
            className={`mf-tab ${statusFilter === 'vencidos' ? 'mf-tab--active' : ''}`}
            onClick={() => setStatusFilter('vencidos')}
          >
            <TimerOff size={16} />
            Vencidos
            <span className="mf-tab__count">{expiredAds.length}</span>
          </button>
        </div>
      )}

      {statusFilter === 'vencidos' && (
        <p className="expired-ads-help">
          Anúncios postados há mais de 30 dias são considerados vencidos e ficam indisponíveis para receber candidaturas.
        </p>
      )}

      {/* Ads list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
          <Clock size={20} className="animate-spin" style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }} /> Carregando seus anúncios...
        </div>
      ) : visibleAds.length > 0 ? (
        <div className="mc-list" key={statusFilter}>
          {visibleAds.map((ad, index) => (
            <div
              key={ad.id}
              className="mf-card mc-card-enter"
              style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
            >
              <div className="mf-card__summary" style={{ cursor: 'default' }}>
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  <div className="mf-card__badges">
                    <span
                      className="badge"
                      style={{
                        background: isExpired(ad) ? 'var(--danger-soft)' : 'var(--success-soft)',
                        color: isExpired(ad) ? 'var(--danger-color)' : 'var(--success-color)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {isExpired(ad) ? 'Vencido' : isFinalized(ad) ? 'Finalizado' : 'Ativo'}
                    </span>
                  </div>
                  <h3 className="mf-card__title">
                    <Link
                      to={`/ad/${ad.id}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                    >
                      {ad.title || ad.titulo}
                    </Link>
                  </h3>
                  <div className="mf-card__meta">
                    <span>
                      <Clock size={15} />
                      Publicado em {new Date(ad.created_at).toLocaleDateString()}
                    </span>
                    {ad.category && (
                      <span>
                        <strong>{ad.category}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mf-card__actions" style={{ minWidth: '180px', flexShrink: 0 }}>
                  <Link
                    to={`/my-ads/manage/${ad.id}`}
                    className="btn"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
                  >
                    <Settings size={16} />
                    Gerenciar Candidaturas
                  </Link>
                  <Link
                    to={`/ad/${ad.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
                  >
                    <Eye size={16} />
                    Ver detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : myAds.length === 0 ? (
        <div className="mf-empty">
          <div className="mf-empty__icon">
            <Megaphone size={28} />
          </div>
          <h3>Você ainda não possui nenhum anúncio.</h3>
          <p>Publique um anúncio para começar a receber candidaturas.</p>
          <Link to="/create-ad" className="btn">
            Postar um anúncio
          </Link>
        </div>
      ) : (
        <div className="mf-empty">
          <div className="mf-empty__icon">
            {statusFilter === 'ativos' ? <Clock size={28} /> : statusFilter === 'finalizados' ? <CheckCircle size={28} /> : <TimerOff size={28} />}
          </div>
          <h3>
            {statusFilter === 'ativos'
              ? 'Nenhum anúncio ativo.'
              : statusFilter === 'finalizados'
                ? 'Nenhum anúncio finalizado.'
                : 'Nenhum anúncio vencido.'}
          </h3>
          <p>
            {statusFilter === 'ativos'
              ? 'Seus anúncios publicados aparecerão aqui.'
              : statusFilter === 'finalizados'
                ? 'Anúncios finalizados aparecerão aqui.'
                : 'Anúncios vencidos aparecerão aqui.'}
          </p>
        </div>
      )}
    </div>
  );
}
