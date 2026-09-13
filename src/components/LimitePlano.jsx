import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Send } from 'lucide-react';
import PropTypes from 'prop-types';

const CONFIG_POR_RECURSO = {
  anuncios: {
    endpoint: 'http://localhost:8000/api/ads/limite/',
    icon: Megaphone,
    rotulo: 'Anúncios postados este mês',
    unidade: 'anúncios',
  },
  candidaturas: {
    endpoint: 'http://localhost:8000/api/candidaturas/limite/',
    icon: Send,
    rotulo: 'Candidaturas enviadas este mês',
    unidade: 'candidaturas',
  },
};

function corPorUso(usados, limite) {
  if (limite === null || limite === undefined) return 'var(--success-color)';
  const proporcao = limite > 0 ? usados / limite : 1;
  if (proporcao >= 1) return 'var(--danger-color)';
  if (proporcao >= 0.7) return 'var(--warning-color)';
  return 'var(--success-color)';
}

/**
 * Mostra quanto do limite mensal do plano (anúncios ou candidaturas) o
 * usuário já usou, com link para upgrade quando estiver perto do limite.
 * Consome os endpoints de status já usados para bloquear a criação
 * (backend/core/views.py: _status_limite_anuncios / _status_limite_candidaturas).
 */
export default function LimitePlano({ recurso }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const { endpoint } = CONFIG_POR_RECURSO[recurso];
    fetch(endpoint, { headers: { Authorization: `Token ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatus(data))
      .catch((err) => console.error(err));
  }, [recurso]);

  if (!status) return null;

  const { icon: Icon, rotulo, unidade } = CONFIG_POR_RECURSO[recurso];
  const { limite, usados, atingiu_limite: atingiuLimite } = status;
  const ilimitado = limite === null || limite === undefined;
  const cor = corPorUso(usados, limite);
  const proporcao = ilimitado ? 100 : Math.min(100, (usados / Math.max(limite, 1)) * 100);

  return (
    <div
      className="ad-sidebar-card"
      style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Icon size={16} color={cor} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{rotulo}</span>
        </div>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: cor }}>
          {ilimitado ? 'Ilimitado' : `${usados} de ${limite}`}
        </span>
      </div>

      {!ilimitado && (
        <div style={{ height: '6px', borderRadius: '999px', background: 'var(--secondary)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${proporcao}%`, background: cor, borderRadius: '999px' }} />
        </div>
      )}

      {atingiuLimite && (
        <p style={{ fontSize: '0.82rem', color: 'var(--danger-color)', marginTop: '0.6rem', marginBottom: 0 }}>
          Limite de {unidade} do plano atingido este mês.{' '}
          <Link to="/plans" style={{ color: 'inherit', fontWeight: 600 }}>Ver planos</Link>
        </p>
      )}
    </div>
  );
}

LimitePlano.propTypes = {
  recurso: PropTypes.oneOf(['anuncios', 'candidaturas']).isRequired,
};
