import { useState } from 'react';
import PropTypes from 'prop-types';
import { X, AlertTriangle } from 'lucide-react';
import { useDialogo } from '../context/ContextoDialogo';

// Erros do DRF chegam como { detail }, { error } ou uma lista de mensagens
function mensagemDeErro(data) {
  if (Array.isArray(data) && data.length) return data[0];
  return data?.detail || data?.error || 'Não foi possível enviar a denúncia. Tente novamente.';
}

export default function ReportModal({ isOpen, onClose, targetId, targetName, type }) {
  const { alerta } = useDialogo();
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !comment.trim()) {
      await alerta('Escolha o motivo e descreva o que aconteceu.', { titulo: 'Denúncia incompleta', variante: 'perigo' });
      return;
    }

    setEnviando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/reports/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Token ${token}` } : {}),
        },
        body: JSON.stringify({
          type: type,
          target_id: String(targetId),
          target_name: targetName,
          category: category,
          comment: comment
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(mensagemDeErro(data));

      setCategory('');
      setComment('');
      onClose();
      await alerta(
        'A equipe de moderação vai analisar o caso e você será avisado do resultado.',
        { titulo: 'Denúncia enviada', variante: 'sucesso' },
      );
    } catch (err) {
      await alerta(err.message, { titulo: 'Denúncia não enviada', variante: 'perigo' });
    } finally {
      setEnviando(false);
    }
  };

  const title = type === 'user' ? 'Denunciar Usuário' : 'Denunciar Anúncio';
  const description = type === 'user'
    ? `Você está prestes a denunciar o usuário "${targetName}". Por favor, informe o motivo.`
    : `Você está prestes a denunciar o anúncio "${targetName}". Por favor, informe o motivo.`;

  return (
    <div className="mf-modal-backdrop">
       <div className="mf-modal" style={{ width: '100%', maxWidth: '450px' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
          >
            <X size={24} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="var(--danger-color)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--danger-color)' }}>{title}</h2>
          </div>

          <p style={{ fontSize: '0.95rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.5' }}>
            {description} Quem foi denunciado não verá quem enviou a denúncia. Denúncias consideradas improcedentes com frequência bloqueiam temporariamente o envio de novas denúncias.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
             <div>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Motivo da Denúncia</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ background: 'var(--bg-color)', color: 'var(--text-color)' }}
                >
                  <option value="">Selecione um motivo...</option>
                  <option value="spam">Spam ou Comportamento Inoportuno</option>
                  <option value="fraude">Suspeita de Fraude ou Golpe</option>
                  <option value="ofensivo">Linguagem Ofensiva / Assédio</option>
                  <option value="inadequado">Conteúdo Inadequado</option>
                  <option value="outro">Outro</option>
                </select>
             </div>

             <div>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Comentário / Detalhes</label>
                <textarea
                  className="input"
                  rows="4"
                  placeholder="Por favor, forneça mais detalhes sobre o ocorrido para ajudar nossa moderação..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ background: 'var(--bg-color)', color: 'var(--text-color)' }}
                ></textarea>
             </div>

             <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, textTransform: 'uppercase', fontSize: '0.85rem', border: '1px solid var(--border-color)', background: 'transparent' }} onClick={onClose}>CANCELAR</button>
                <button type="submit" className="btn" disabled={enviando} style={{ flex: 1, background: 'var(--danger-color)', color: '#FFFFFF', border: 'none', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                   {enviando ? 'ENVIANDO...' : 'ENVIAR DENÚNCIA'}
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}

ReportModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  targetId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  targetName: PropTypes.string,
  type: PropTypes.oneOf(['user', 'ad']).isRequired,
};
