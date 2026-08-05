import { useParams, Link } from 'react-router-dom';
import { Check, X, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotificacoes } from '../context/ContextoNotificacao';

export default function ManageAdApplications() {
  const { id } = useParams();
  const { marcarLidas } = useNotificacoes();
  const [ad, setAd] = useState(null);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    marcarLidas(['candidatura']);
  }, [marcarLidas]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Fetch ad details
    fetch(`http://localhost:8000/api/ads/${id}/`, {
      headers: {
        'Authorization': `Token ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha ao carregar anúncio');
      return res.json();
    })
    .then(data => {
      setAd(data);
    })
    .catch(err => {
      console.error(err);
      setErrorMsg('Erro ao carregar detalhes do anúncio.');
    });

    // Fetch applications
    fetch(`http://localhost:8000/api/candidaturas/?ad_id=${id}`, {
      headers: {
        'Authorization': `Token ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Falha ao carregar candidaturas');
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setApplications(data);
      }
      setIsLoading(false);
    })
    .catch(err => {
      console.error(err);
      setErrorMsg('Erro ao carregar candidaturas.');
      setIsLoading(false);
    });
  }, [id]);

  const handleUpdateStatus = (appId, newStatus) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:8000/api/candidaturas/${appId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({ status: newStatus.toLowerCase() })
    })
    .then(res => {
      return res.json().then(data => ({ ok: res.ok, data }));
    })
    .then(({ ok, data }) => {
      if (!ok) {
        throw new Error(data.error || 'Não foi possível atualizar a candidatura.');
      }

      setApplications(apps => apps.map(app => {
        if (app.id === appId) return { ...app, status: newStatus.toLowerCase() };
        if (newStatus.toLowerCase() === 'aprovada' && app.status === 'pendente') {
          return { ...app, status: 'encerrada', indisponivel: true };
        }
        return app;
      }));

      if (newStatus.toLowerCase() === 'aprovada') {
        setAd(prev => prev ? { ...prev, status_anuncio: 'Finalizado' } : null);
      }
    })
    .catch(err => setErrorMsg(err.message));
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando candidaturas...</div>;
  }

  if (errorMsg || !ad) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--holo-salmon)' }}>{errorMsg || 'Anúncio não encontrado.'}</div>;
  }

  const adStatus = ad.status_anuncio || 'Em aberto';

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Gerenciar Candidaturas</h1>
        <span className={adStatus === 'Em aberto' || adStatus === 'Ativo' ? "badge salmon" : "badge purple"} style={{ color: 'white' }}>
          {adStatus}
        </span>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
         <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.25rem' }}>Anúncio</div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{ad.title || ad.titulo}</h2>
         </div>
         <div className="badge"><Tag size={12} style={{ marginRight: '4px' }}/> {ad.category}</div>
      </div>
      
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
         Propostas Recebidas ({applications.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {applications.map(app => (
          <div key={app.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--holo-gradient-purple)' }}></div>
                  <div>
                     <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {app.applicant_name} 
                        <Link to={`/user/${app.user}`} style={{ fontSize: '0.85rem', color: 'var(--holo-blue)', textDecoration: 'underline' }}>(Ver perfil)</Link>
                     </h3>
                     <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.25rem' }}>
                       Valor proposto do anúncio: <strong>R$ {ad.price}</strong>
                     </div>
                  </div>
               </div>

               {app.status !== 'pendente' && (
                  <span className="badge" style={{ background: app.status === 'aprovada' ? '#1dd1a1' : app.status === 'encerrada' ? '#777' : '#ff6b6b', color: 'white', borderColor: 'transparent' }}>
                    {app.status === 'aprovada' ? 'Aprovada' : app.status === 'encerrada' ? 'Indisponível' : 'Recusada'}
                  </span>
               )}
            </div>

            {app.status === 'encerrada' && (
              <p style={{ margin: 0, padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(120,120,120,0.12)', opacity: 0.8 }}>
                Esta candidatura foi encerrada porque outra proposta já foi aprovada.
              </p>
            )}

            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
               <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Mensagem de Apresentação</div>
               <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.9 }}>“{app.mensagem}”</p>
            </div>

            {app.status === 'pendente' && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                 <button className="btn" style={{ flex: 1, background: '#1dd1a1', border: 'none' }} onClick={() => handleUpdateStatus(app.id, 'aprovada')}>
                   <Check size={18} /> Aprovar
                 </button>
                 <button className="btn btn-secondary" style={{ flex: 1, borderColor: '#ff6b6b', color: '#ff6b6b' }} onClick={() => handleUpdateStatus(app.id, 'recusada')}>
                   <X size={18} /> Recusar
                 </button>
                 <Link to="/chat" className="btn btn-secondary" style={{ flex: 1 }}>
                   Conversar
                 </Link>
              </div>
            )}

          </div>
        ))}

        {applications.length === 0 && (
           <p style={{ textAlign: 'center', opacity: 0.7, padding: '2rem 0' }}>Nenhuma proposta recebida até o momento.</p>
        )}
      </div>

    </div>
  );
}
