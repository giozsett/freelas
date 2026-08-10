import { Link } from 'react-router-dom';
import { MapPin, DollarSign, Star, Wifi } from 'lucide-react';
import PropTypes from 'prop-types';

export default function AdCard({ ad }) {
  return (
    <div className="card card-hover ad-card">
      <div className="ad-card-heading">
        <h3>{ad.title}</h3>
        <div className="ad-card-rating">
          <Star size={18} fill="currentColor" /> {ad.rating}
        </div>
      </div>

      <div className="ad-card-byline">
        <strong>{ad.author}</strong>
        <span>•</span>
        <span>{ad.locationType === 'remoto' ? 'Vaga remota' : 'Vaga presencial'}</span>
      </div>

      <div className="ad-card-tags">
        <span className="badge ad-category-badge">{ad.category}</span>
        {ad.skills.map((skill, idx) => (
          <span key={idx} className="badge ad-skill-badge">{skill}</span>
        ))}
      </div>

      <div className="ad-price-card">
        <DollarSign size={19} />
        <strong>{ad.price}</strong>
      </div>

      <div className="ad-location-row">
          {ad.locationType === 'remoto' ? <Wifi size={18} /> : <MapPin size={18} />}
          <span>
            {ad.locationType === 'remoto'
              ? 'Remoto' 
              : [ad.address, ad.city].filter(Boolean).join(' - ') || 'Presencial'
            }
          </span>
      </div>

      <Link to={`/ad/${ad.id}`} className="btn ad-card-action">
        Ver Detalhes
      </Link>
    </div>
  );
}

AdCard.propTypes = {
  ad: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string.isRequired,
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    author: PropTypes.string,
    locationType: PropTypes.string,
    category: PropTypes.string,
    skills: PropTypes.arrayOf(PropTypes.string),
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    address: PropTypes.string,
    city: PropTypes.string,
  }).isRequired,
};
