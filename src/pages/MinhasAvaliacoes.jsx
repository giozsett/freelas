import { useEffect, useState } from 'react';
import { CheckCircle, ClipboardCheck, History, MessageCircle, Star } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useNotificacoes } from '../context/ContextoNotificacao';

const API = 'http://localhost:8000';

export default function MinhasAvaliacoes() {
  const { token } = useAuth();
  const { marcarLidas } = useNotificacoes();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [sentReviews, setSentReviews] = useState([]);
  const [forms, setForms] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    marcarLidas(['avaliacao']);
  }, [marcarLidas]);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Token ${token}` };

    Promise.all([
      fetch(`${API}/api/avaliacoes/pendentes/`, { headers }),
      fetch(`${API}/api/avaliacoes/`, { headers }),
    ])
      .then(async ([pendingResponse, sentResponse]) => {
        if (!pendingResponse.ok || !sentResponse.ok) {
          throw new Error('Não foi possível carregar suas avaliações.');
        }
        const [pendingData, sentData] = await Promise.all([
          pendingResponse.json(),
          sentResponse.json(),
        ]);
        setPendingReviews(Array.isArray(pendingData) ? pendingData : []);
        setSentReviews(Array.isArray(sentData) ? sentData : []);

        const requestedAgreement = Number(new URLSearchParams(window.location.search).get('acordo'));
        if (requestedAgreement) {
          window.history.replaceState({}, document.title, window.location.pathname);
          setActiveTab('pending');
          setTimeout(() => {
            document.getElementById(`avaliacao-${requestedAgreement}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 50);
        }
      })
      .catch(error => setMessage({ type: 'error', text: error.message }))
      .finally(() => setIsLoading(false));
  }, [token]);

  const getForm = (agreementId) => forms[agreementId] || { criterios: {}, comentario: '' };

  const setScore = (agreementId, criterion, score) => {
    setForms(current => {
      const existing = current[agreementId] || { criterios: {}, comentario: '' };
      return {
        ...current,
        [agreementId]: {
          ...existing,
          criterios: {
            ...existing.criterios,
            [criterion]: score,
          },
        },
      };
    });
  };

  const setComment = (agreementId, comentario) => {
    setForms(current => {
      const existing = current[agreementId] || { criterios: {}, comentario: '' };
      return {
        ...current,
        [agreementId]: {
          ...existing,
          comentario,
        },
      };
    });
  };

  const submitReview = async (pending) => {
    const form = getForm(pending.acordo_id);
    const hasAllScores = pending.criterios.every(item => form.criterios[item.chave]);
    if (!hasAllScores || form.comentario.trim().length < 5) {
      setMessage({
        type: 'error',
        text: 'Avalie todos os critérios e escreva um comentário com pelo menos 5 caracteres.',
      });
      return;
    }

    setSubmittingId(pending.acordo_id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`${API}/api/avaliacoes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          acordo: pending.acordo_id,
          criterios: form.criterios,
          comentario: form.comentario.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = data.non_field_errors?.[0] || data.criterios?.[0] || data.comentario?.[0] || data.detail;
        throw new Error(detail || 'Não foi possível enviar a avaliação.');
      }

      setPendingReviews(current => current.filter(item => item.acordo_id !== pending.acordo_id));
      setSentReviews(current => [data, ...current]);
      setMessage({ type: 'success', text: 'Avaliação enviada com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando avaliações...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <ClipboardCheck size={34} color="var(--primary)" />
        <h1 style={{ margin: 0, fontSize: '2.4rem' }}>Minhas Avaliações</h1>
      </div>
      <p style={{ opacity: 0.75, marginBottom: '2rem' }}>
        Avalie a outra parte depois da conclusão do serviço e consulte o histórico das avaliações que você enviou.
      </p>

      {message.text && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          style={{
            padding: '0.9rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: `1px solid ${message.type === 'error' ? '#ff4757' : '#2ed573'}`,
            background: message.type === 'error' ? 'rgba(255,71,87,0.08)' : 'rgba(46,213,115,0.08)',
          }}
        >
          {message.text}
        </div>
      )}

      <div role="tablist" aria-label="Filtrar avaliações" className="card" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          className={activeTab === 'pending' ? 'btn' : 'btn btn-secondary'}
        >
          Pendentes ({pendingReviews.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sent'}
          onClick={() => setActiveTab('sent')}
          className={activeTab === 'sent' ? 'btn' : 'btn btn-secondary'}
        >
          <History size={17} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
          Já enviadas ({sentReviews.length})
        </button>
      </div>

      {activeTab === 'pending' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pendingReviews.length ? pendingReviews.map(pending => {
            const form = getForm(pending.acordo_id);
            return (
              <div id={`avaliacao-${pending.acordo_id}`} key={pending.acordo_id} className="card" style={{ borderLeft: '5px solid var(--primary)' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <span className="badge purple" style={{ color: 'white' }}>
                    Avaliação como {pending.papel_avaliado === 'freelancer' ? 'Freelancer' : 'Contratante'}
                  </span>
                  <h2 style={{ margin: '0.6rem 0 0.25rem', fontSize: '1.4rem' }}>{pending.titulo_acordo}</h2>
                  <p style={{ margin: 0, opacity: 0.75 }}>
                    Avaliando <strong>{pending.avaliado_nome}</strong>
                  </p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {pending.criterios.map(criterion => (
                    <div key={criterion.chave} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{criterion.rotulo}</span>
                      <div role="radiogroup" aria-label={criterion.rotulo} style={{ display: 'flex', gap: '0.25rem' }}>
                        {[1, 2, 3, 4, 5].map(score => {
                          const selected = score <= (form.criterios[criterion.chave] || 0);
                          return (
                            <button
                              key={score}
                              type="button"
                              role="radio"
                              aria-checked={form.criterios[criterion.chave] === score}
                              aria-label={`${score} estrelas`}
                              onClick={() => setScore(pending.acordo_id, criterion.chave, score)}
                              style={{ border: 0, padding: '0.15rem', background: 'transparent', cursor: 'pointer', color: '#f1c40f' }}
                            >
                              <Star size={27} fill={selected ? 'currentColor' : 'transparent'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <label style={{ display: 'block', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.45rem' }}>
                  Comentário geral sobre o serviço
                </label>
                <textarea
                  className="input"
                  rows={4}
                  maxLength={2000}
                  value={form.comentario}
                  onChange={event => setComment(pending.acordo_id, event.target.value)}
                  placeholder="Conte como foi sua experiência com a outra parte..."
                  style={{ resize: 'vertical' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={submittingId !== null}
                    onClick={() => submitReview(pending)}
                  >
                    {submittingId === pending.acordo_id ? 'Enviando...' : 'Enviar avaliação'}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <CheckCircle size={46} color="#2ed573" />
              <h2 style={{ marginBottom: '0.5rem' }}>Nenhuma avaliação pendente</h2>
              <p style={{ opacity: 0.7, margin: 0 }}>Quando um acordo for concluído, a avaliação aparecerá aqui.</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sentReviews.length ? sentReviews.map(review => (
            <div key={review.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{review.titulo_acordo}</h2>
                  <p style={{ margin: '0.25rem 0 0', opacity: 0.7 }}>
                    Você avaliou <strong>{review.avaliado_nome}</strong> como {review.papel_avaliado === 'freelancer' ? 'freelancer' : 'contratante'}.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold', fontSize: '1.15rem' }}>
                  <Star size={22} fill="#f1c40f" color="#f1c40f" /> {Number(review.nota_geral).toFixed(1)}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
                {Object.entries(review.criterios_exibicao || {}).map(([label, score]) => (
                  <span key={label} className="badge">{label}: {score}/5</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <MessageCircle size={18} style={{ opacity: 0.55, marginTop: '0.15rem' }} />
                <p style={{ margin: 0, fontStyle: 'italic' }}>“{review.comentario}”</p>
              </div>
            </div>
          )) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.75 }}>
              Você ainda não enviou avaliações.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
