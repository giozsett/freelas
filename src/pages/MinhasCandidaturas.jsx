import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useNotificacoes } from '../context/ContextoNotificacao';

export default function MyApplications() {
  const { user } = useAuth();
  const { marcarLidas } = useNotificacoes();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ativas');

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
        'Authorization': `Token ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setApplications(data);
      setIsLoading(false);
    })
    .catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [user]);

  const isFinalizada = (app) => app.indisponivel || app.status !== 'pendente';
  const activeApplications = applications.filter(app => !isFinalizada(app));
  const finishedApplications = applications.filter(isFinalizada);
  const visibleApplications = activeTab === 'ativas' ? activeApplications : finishedApplications;

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Send size={32} color="var(--holo-salmon)" />
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Minhas Candidaturas</h1>
      </div>
      
      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
        Confira o histórico das suas propostas enviadas aos contratantes e acompanhe os resultados.
      </p>

      <div role="tablist" aria-label="Filtrar candidaturas" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {[
          ['ativas', `Ativas (${activeApplications.length})`],
          ['finalizadas', `Finalizadas (${finishedApplications.length})`],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            style={{ background: 'none', border: 'none', borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', font: 'inherit', fontWeight: activeTab === tab ? 700 : 500, padding: '0.8rem 1rem', whiteSpace: 'nowrap' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando candidaturas...</div>
        ) : visibleApplications.length > 0 ? (
          visibleApplications.map(app => {
            const isUnavailable = app.indisponivel || app.status === 'encerrada';
            const isExpired = app.motivo_indisponibilidade === 'Anúncio expirado.';
            return (
            <div
              key={app.id}
              className={`card ${isUnavailable ? '' : 'card-hover'}`}
              aria-disabled={isUnavailable}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                opacity: isUnavailable ? 0.58 : 1,
                filter: isUnavailable ? 'grayscale(0.45)' : 'none',
              }}
            >
              
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to={`/ad/${app.anuncio_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, textDecoration: 'underline' }}>{app.ad_title}</h2>
                  </Link>
                  {app.status === 'aprovada' && <span className="badge" style={{ background: '#1dd1a1', border: '1px solid #1dd1a1', color: 'white' }}><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Aprovada</span>}
                  {app.status === 'pendente' && !isExpired && <span className="badge purple" style={{ color: 'white' }}><Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Em análise</span>}
                  {app.status === 'recusada' && <span className="badge" style={{ background: '#ff6b6b', border: '1px solid #ff6b6b', color: 'white' }}><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Recusada</span>}
                  {isUnavailable && <span className="badge" style={{ background: '#777', border: '1px solid #777', color: 'white' }}><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> {isExpired ? 'Anúncio expirado' : 'Encerrada'}</span>}
                </div>

                <div style={{ fontSize: '0.9rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   Enviada em {new Date(app.enviado_em).toLocaleDateString()}
                </div>
                {isUnavailable && (
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', fontWeight: 600 }}>
                    {app.motivo_indisponibilidade || 'O autor já selecionou outro profissional ou contratante para este anúncio.'}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.5rem', minWidth: '150px', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                {isUnavailable ? (
                  <button className="btn btn-secondary" disabled style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: '100%', marginTop: '0.5rem', cursor: 'not-allowed' }}>
                    Candidatura indisponível
                  </button>
                ) : (
                  <Link to={app.acordo_id ? `/chat/${app.acordo_id}` : '/chat'} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: '100%', marginTop: '0.5rem' }}>
                    Ver no Chat
                  </Link>
                )}
              </div>

            </div>
            );
          })
        ) : applications.length === 0 ? (
           <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>Você ainda não se candidatou a nenhum anúncio.</h3>
             <Link to="/" className="btn dark-text">Procurar vagas e serviços</Link>
           </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>
              {activeTab === 'ativas' ? 'Nenhuma candidatura ativa.' : 'Nenhuma candidatura finalizada.'}
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {activeTab === 'ativas' ? 'Suas candidaturas pendentes aparecerão aqui.' : 'O histórico de candidaturas encerradas aparecerá aqui.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
