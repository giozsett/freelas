import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

export default function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Send size={32} color="var(--holo-salmon)" />
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Minhas Candidaturas</h1>
      </div>
      
      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
        Confira o histórico das suas propostas enviadas aos contratantes e acompanhe os resultados.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando candidaturas...</div>
        ) : applications.length > 0 ? (
          applications.map(app => (
            <div key={app.id} className="card card-hover" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'stretch' }}>
              
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to={`/ad/${app.anuncio_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, textDecoration: 'underline' }}>{app.ad_title}</h2>
                  </Link>
                  {app.status === 'aprovada' && <span className="badge" style={{ background: '#1dd1a1', border: '1px solid #1dd1a1', color: 'white' }}><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Aprovada</span>}
                  {app.status === 'pendente' && <span className="badge purple" style={{ color: 'white' }}><Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Em análise</span>}
                  {app.status === 'recusada' && <span className="badge" style={{ background: '#ff6b6b', border: '1px solid #ff6b6b', color: 'white' }}><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Recusada</span>}
                </div>

                <div style={{ fontSize: '0.9rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   Enviada em {new Date(app.enviado_em).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.5rem', minWidth: '150px', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                <Link to="/chat" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: '100%', marginTop: '0.5rem' }}>
                  Ver no Chat
                </Link>
              </div>

            </div>
          ))
        ) : (
           <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>Você ainda não se candidatou a nenhum anúncio.</h3>
             <Link to="/" className="btn dark-text">Procurar vagas e serviços</Link>
           </div>
        )}
      </div>
    </div>
  );
}
