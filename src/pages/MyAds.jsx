import { Link } from 'react-router-dom';
import { Package, CheckCircle, Clock } from 'lucide-react';

export default function MyAds() {
  const myAds = [
    { id: 101, title: 'Desenvolvimento de Site E-commerce', status: 'Em aberto', proposals: 12, date: '20/03/2026' },
    { id: 102, title: 'Manutenção de Servidor Linux', status: 'Em andamento', proposals: 3, date: '15/03/2026' },
    { id: 103, title: 'Criação de Logo Nova', status: 'Concluído', proposals: 25, date: '01/02/2026' }
  ];

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Package size={32} color="var(--holo-blue)" />
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Meus Anúncios</h1>
      </div>
      
      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
        Acompanhe os anúncios que você postou, verifique o status de cada um e veja quantas candidaturas foram recebidas.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {myAds.map(ad => (
          <div key={ad.id} className="card card-hover" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
            
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{ad.title}</h2>
                {ad.status === 'Em aberto' && <span className="badge salmon">Em aberto</span>}
                {ad.status === 'Em andamento' && <span className="badge purple" style={{ color: 'white' }}>Em andamento</span>}
                {ad.status === 'Concluído' && <span className="badge" style={{ background: '#1dd1a1', borderColor: '#1dd1a1', color: 'white' }}>Concluído</span>}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} /> Publicado em {ad.date}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', minWidth: '150px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                Solicitações recebidas: <span style={{ color: 'var(--holo-blue)', fontSize: '1.5rem', marginLeft: '0.25rem' }}>{ad.proposals}</span>
              </div>
              
              <Link to={`/my-ads/manage/${ad.id}`} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: '100%' }}>
                Visualizar Solicitações
              </Link>
            </div>

          </div>
        ))}
        
        {myAds.length === 0 && (
           <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
             <h3 style={{ marginBottom: '1rem' }}>Você ainda não publicou nenhum anúncio.</h3>
             <Link to="/create-ad" className="btn dark-text">Postar meu primeiro anúncio</Link>
           </div>
        )}
      </div>
    </div>
  );
}
