import { Link } from 'react-router-dom';
import { MapPin, Star, Wifi, Clock } from 'lucide-react';
import PropTypes from 'prop-types';

function diasDesde(dataISO) {
  if (!dataISO) return null;
  const diffMs = Date.now() - new Date(dataISO).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function tempoPublicacao(dias) {
  if (dias === null) return null;
  if (dias < 1) return 'Hoje';
  if (dias === 1) return '1 dia';
  if (dias < 7) return `${dias} dias`;
  if (dias < 14) return '1 semana';
  return `${Math.floor(dias / 7)} semanas`;
}

export default function AdCard({ ad }) {
  const skillsVisiveis = ad.skills.slice(0, 3);
  const skillsRestantes = ad.skills.length - skillsVisiveis.length;
  const tempo = tempoPublicacao(diasDesde(ad.createdAt));

  return (
    <article className="card card-hover ad-list-card">
      <div className="ad-list-card__zone">
        <div className="ad-list-card__top">
          <span className="ad-chip">{ad.category}</span>
          <div className="ad-list-card__top-right">
            {tempo && (
              <span className="ad-list-card__date"><Clock size={11} /> {tempo}</span>
            )}
            <span className="ad-list-card__rating"><Star size={14} fill="currentColor" /> {ad.rating}</span>
          </div>
        </div>

        <Link to={`/ad/${ad.id}`} className="ad-list-card__title link-hover-card">{ad.title}</Link>

        <div className="ad-list-card__meta">
          <span>{ad.author}</span>
        </div>
      </div>

      <div className="ad-list-card__zone">
        <div className="ad-list-card__chips">
          <span className="ad-chip">
            {ad.locationType === 'remoto' ? <Wifi size={13} /> : <MapPin size={13} />}
            {ad.locationType === 'remoto'
              ? 'Remoto'
              : [ad.address, ad.city].filter(Boolean).join(' - ') || 'Presencial'}
          </span>
        </div>

        <div className="ad-list-card__skills">
          {skillsVisiveis.map(skill => (
            <span key={skill} className="badge">{skill}</span>
          ))}
          {skillsRestantes > 0 && <span className="ad-list-card__skill-more">+{skillsRestantes}</span>}
        </div>
      </div>

      <div className="ad-list-card__zone ad-list-card__zone--footer">
        <div className="ad-list-card__price">
          <span className="label">{ad.type === 'freelancer' ? 'A partir de' : 'Orçamento'}</span>
          <strong>
            R$ {ad.price}
            {ad.priceUnit && ad.priceUnit !== 'total' && <small>{ad.priceUnit}</small>}
          </strong>
        </div>
        <Link to={`/ad/${ad.id}`} className="btn">Ver detalhes</Link>
      </div>
    </article>
  );
}

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    type: PropTypes.string,
    title: PropTypes.string.isRequired,
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    author: PropTypes.string,
    locationType: PropTypes.string,
    category: PropTypes.string,
    skills: PropTypes.arrayOf(PropTypes.string),
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    priceUnit: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
};
