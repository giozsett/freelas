import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ReportModal({ isOpen, onClose, targetId, targetName, type }) {
  const [category, setCategory] = useState('');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !comment.trim()) {
      alert('Por favor, preencha todos os campos da denúncia.');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/reports/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          target_id: String(targetId),
          target_name: targetName,
          category: category,
          comment: comment
        })
      });

      if (!response.ok) {
         throw new Error('Falha ao enviar denúncia.');
      }

      alert('Denúncia enviada com sucesso! A equipe de moderação avaliará o caso em breve.');
      setCategory('');
      setComment('');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao enviar a denúncia. O backend pode estar offline.');
    }
  };

  const title = type === 'user' ? 'Denunciar Usuário' : 'Denunciar Anúncio';
  const description = type === 'user' 
    ? `Você está prestes a denunciar o usuário "${targetName}". Por favor, informe o motivo.`
    : `Você está prestes a denunciar o anúncio "${targetName}". Por favor, informe o motivo.`;

  return (
    <div style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', 
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', 
        padding: '1rem' 
    }}>
       <div className="card" style={{ width: '100%', maxWidth: '450px', position: 'relative', borderTop: '4px solid #ff4757' }}>
          <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
          >
            <X size={24} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={28} color="#ff4757" />
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{title}</h2>
          </div>
          
          <p style={{ fontSize: '0.95rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.5' }}>
            {description} A denúncia é anônima e será analisada pelos nossos moderadores.
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
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn" style={{ flex: 1, background: '#ff4757', color: 'white', borderColor: '#ff4757' }}>
                   Enviar Denúncia
                </button>
             </div>
          </form>
       </div>
    </div>
  );
}
