import { ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Termômetro de reputação reutilizável (usado nas páginas de perfil).
 * Recebe o objeto retornado por calcular_reputacao_usuario (score, label,
 * color, tags, total_avaliacoes, completude_perfil) para um papel
 * (freelancer ou contratante).
 */
export default function TermometroReputacao({ titulo, reputacao }) {
  if (!reputacao) return null;

  const { score, label, color, tags = [], total_avaliacoes, completude_perfil } = reputacao;

  return (
    <div className="ad-sidebar-card" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
      <div className="ad-panel__heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <span className="icon-badge sm" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%' }}>
          <ShieldCheck size={16} />
        </span>
        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{titulo}</span>
      </div>
      <div className="rep-score-row">
        <div className="rep-score-track">
          <div className="rep-score-marker" style={{ left: `${score}%`, border: `3px solid ${color}` }} />
        </div>
        <span className="rep-score-label" style={{ color }}>{label}</span>
      </div>
      <p className="rep-note">
        {total_avaliacoes > 0
          ? `Baseado em ${total_avaliacoes} ${total_avaliacoes === 1 ? 'avaliação recebida' : 'avaliações recebidas'}${typeof completude_perfil === 'number' ? ` e ${completude_perfil}% do perfil preenchido.` : '.'}`
          : `Ainda sem avaliações recebidas nesta função${typeof completude_perfil === 'number' ? ` — ${completude_perfil}% do perfil preenchido.` : '.'}`}
      </p>
      {tags.length > 0 && (
        <div className="reputation-tags">
          {tags.map(tag => (
            <span key={tag.text} className={`reputation-tag ${tag.tone}`}>
              {tag.tone === 'positivo' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {tag.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

TermometroReputacao.propTypes = {
  titulo: PropTypes.string.isRequired,
  reputacao: PropTypes.shape({
    score: PropTypes.number,
    label: PropTypes.string,
    color: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.shape({
      tone: PropTypes.string,
      text: PropTypes.string,
    })),
    total_avaliacoes: PropTypes.number,
    completude_perfil: PropTypes.number,
  }),
};
