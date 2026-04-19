import { Link } from 'react-router-dom';
import { Send, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function MyApplications() {
  const applications = [
    { id: 201, adTitle: 'Adestrador de Cães Avançado', contractor: 'Ana Clara', status: 'Aprovada', date: '22/03/2026', proposedPrice: 'R$ 90/hora' },
    { id: 202, adTitle: 'Faxina Completa Residencial', contractor: 'Maria Souza', status: 'Em análise', date: '21/03/2026', proposedPrice: 'R$ 150/dia' },
    { id: 203, adTitle: 'Editor de Vídeo para YouTube', contractor: 'Canal TechCenter', status: 'Recusada', date: '10/03/2026', proposedPrice: 'R$ 800/projeto' },
  ];

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
        {applications.map(app => (
          <div key={app.id} className="card card-hover" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'stretch' }}>
            
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{app.adTitle}</h2>
                {app.status === 'Aprovada' && <span className="badge" style={{ background: '#1dd1a1', border: '1px solid #1dd1a1', color: 'white' }}><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Aprovada</span>}
                {app.status === 'Em análise' && <span className="badge purple" style={{ color: 'white' }}><Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Em análise</span>}
                {app.status === 'Recusada' && <span className="badge" style={{ background: '#ff6b6b', border: '1px solid #ff6b6b', color: 'white' }}><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> Recusada</span>}
              </div>
              
              <div style={{ fontSize: '1rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '500' }}>Anunciante:</span> {app.contractor}
              </div>

              <div style={{ fontSize: '0.9rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 Publicada em {app.date}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '0.5rem', minWidth: '150px', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Valor Proposto:</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{app.proposedPrice}</div>
              
              <Link to="/chat" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: '100%', marginTop: '0.5rem' }}>
                Ver no Chat
              </Link>
            </div>

          </div>
        ))}
        
        {applications.length === 0 && (
           <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>Você ainda não se candidatou a nenhum anúncio.</h3>
             <Link to="/" className="btn dark-text">Procurar vagas e serviços</Link>
           </div>
        )}
      </div>
    </div>
  );
}
