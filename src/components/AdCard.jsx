import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Star } from 'lucide-react';

export default function AdCard({ ad }) {
  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{ad.title}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.7, marginBottom: '0.25rem', fontWeight: '500' }}>
            {ad.locationType === 'remoto' ? 'Vaga Remota' : 'Vaga Presencial'}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>{ad.author}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 'bold' }}>
          <Star size={18} fill="currentColor" /> {ad.rating}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="badge salmon">{ad.category}</span>
        {ad.skills.map((skill, idx) => (
          <span key={idx} className="badge purple">{skill}</span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: 'auto', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={18} /> <span style={{ fontWeight: 'bold' }}>
            {ad.locationType === 'remoto' 
              ? 'Remoto' 
              : (ad.type === 'contractor' ? `${ad.address} - ${ad.city}` : ad.city)
            }
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <DollarSign size={18} /> <span style={{ fontWeight: 'bold' }}>{ad.price}</span>
        </div>
      </div>

      <Link to={`/ad/${ad.id}`} className="btn" style={{ marginTop: '1rem', textAlign: 'center' }}>
        Ver Detalhes
      </Link>
    </div>
  );
}
