import { useParams, Link } from 'react-router-dom';
import { User, Check, X, Tag } from 'lucide-react';
import { useState } from 'react';

export default function ManageAdApplications() {
  const { id } = useParams();

  // Dummy ad details
  const [adStatus, setAdStatus] = useState('Em aberto');
  const ad = { id, title: 'Adestrador de Cães Avançado', tag: 'Animais' };

  // Dummy applications
  const [applications, setApplications] = useState([
    { id: 1, applicantName: 'Roberto Sousa', applicantId: '2', expectedPrice: 'R$ 70/hora', coverLetter: 'Trabalho há 5 anos com comportamento animal e garanto resultados na primeira semana.', status: 'Pendente' },
    { id: 2, applicantName: 'Maria Silva', applicantId: '3', expectedPrice: 'R$ 80/hora', coverLetter: 'Sou parceira certificada e utilizo métodos de reforço positivo exclusivamente.', status: 'Pendente' },
  ]);

  const handleUpdateStatus = (appId, newStatus) => {
    setApplications(apps => apps.map(app => 
       app.id === appId ? { ...app, status: newStatus } : app
    ));
    if (newStatus === 'Aprovada') {
       setAdStatus('Em andamento');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Gerenciar Candidaturas</h1>
        <span className={adStatus === 'Em aberto' ? "badge salmon" : "badge purple"} style={{ color: 'white' }}>{adStatus}</span>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
         <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.25rem' }}>Anúncio</div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{ad.title}</h2>
         </div>
         <div className="badge"><Tag size={12} style={{ marginRight: '4px' }}/> {ad.tag}</div>
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
                       {app.applicantName} 
                       <Link to={`/user/${app.applicantId}`} style={{ fontSize: '0.85rem', color: 'var(--holo-blue)', textDecoration: 'underline' }}>(Ver perfil)</Link>
                     </h3>
                     <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.25rem' }}>Valor proposto: <strong>{app.expectedPrice}</strong></div>
                  </div>
               </div>

               {app.status !== 'Pendente' && (
                  <span className="badge" style={{ background: app.status === 'Aprovada' ? '#1dd1a1' : '#ff6b6b', color: 'white', borderColor: 'transparent' }}>
                    {app.status}
                  </span>
               )}
            </div>

            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
               <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Apresentação</div>
               <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.9 }}>"{app.coverLetter}"</p>
            </div>

            {app.status === 'Pendente' && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                 <button className="btn" style={{ flex: 1, background: '#1dd1a1', border: 'none' }} onClick={() => handleUpdateStatus(app.id, 'Aprovada')}>
                   <Check size={18} /> Aprovar
                 </button>
                 <button className="btn btn-secondary" style={{ flex: 1, borderColor: '#ff6b6b', color: '#ff6b6b' }} onClick={() => handleUpdateStatus(app.id, 'Recusada')}>
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
