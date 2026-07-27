import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

export default function MyAds() {
  const { user } = useAuth();
  const [myAds, setMyAds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ativos');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    fetch('http://localhost:8000/api/ads/?all=true')
      .then(res => res.json())
      .then(data => {
        // filter ads where author matches logged in user id
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
  const activeAds = myAds.filter(ad => !isFinalized(ad));
  const finalizedAds = myAds.filter(isFinalized);
  const visibleAds = statusFilter === 'ativos' ? activeAds : finalizedAds;

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Package size={32} color="var(--holo-blue)" />
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Meus Anúncios</h1>
      </div>
      
      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
        Acompanhe os anúncios que você postou, verifique o status de cada um e veja quantas candidaturas foram recebidas.
      </p>

      <div role="tablist" aria-label="Filtrar anúncios por status" className="card" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'ativos'}
          onClick={() => setStatusFilter('ativos')}
          className={statusFilter === 'ativos' ? 'btn' : 'btn btn-secondary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Clock size={17} /> Ativos ({activeAds.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'finalizados'}
          onClick={() => setStatusFilter('finalizados')}
          className={statusFilter === 'finalizados' ? 'btn' : 'btn btn-secondary'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <CheckCircle size={17} /> Finalizados ({finalizedAds.length})
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {isLoading ? (
           <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando anúncios...</div>
        ) : visibleAds.length > 0 ? (
          visibleAds.map(ad => (
            <div key={ad.id} className="card card-hover" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to={`/ad/${ad.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, textDecoration: 'underline' }}>{ad.title || ad.titulo}</h2>
                  </Link>
                  <span className="badge salmon">Publicado</span>
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} /> Publicado em {new Date(ad.created_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', minWidth: '150px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  Status: <span style={{ color: 'var(--holo-blue)', fontSize: '1.1rem', marginLeft: '0.25rem' }}>{ad.status_anuncio || 'Ativo'}</span>
                </div>
                
                <Link to={`/my-ads/manage/${ad.id}`} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: '100%' }}>
                  Visualizar Solicitações
                </Link>
              </div>

            </div>
          ))
        ) : (
           <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>
               {statusFilter === 'ativos' ? 'Você não possui anúncios ativos.' : 'Você ainda não possui anúncios finalizados.'}
             </h3>
             {statusFilter === 'ativos' && <Link to="/create-ad" className="btn dark-text">Postar um anúncio</Link>}
           </div>
        )}
      </div>
    </div>
  );
}
