import { Gem, Star } from 'lucide-react';
import PropTypes from 'prop-types';

// Selo de assinante (benefício dos planos Gold e Platinum): aparece nas vagas
// de contratantes e nas candidaturas de freelancers, que também ganham destaque
// na ordenação (backend/core/views.py: _prioridade_por_plano).
const SELOS = {
  Gold: { icone: Star, fundo: 'var(--holo-gradient-gold)' },
  Platinum: { icone: Gem, fundo: 'var(--holo-gradient-platinum)' },
};

export default function SeloPlano({ plano }) {
  const selo = SELOS[plano];
  if (!selo) return null;
  const Icone = selo.icone;
  return (
    <span className="selo-plano" style={{ background: selo.fundo }} title={`Assinante ${plano}`}>
      <Icone size={11} /> {plano}
    </span>
  );
}

SeloPlano.propTypes = {
  plano: PropTypes.string,
};
