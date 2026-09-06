import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Wifi, Tag, Tags, Star, ShieldCheck, X, AlertTriangle,
  Flag, Calendar, CalendarClock, CalendarDays, Clock, Inbox, CheckCircle2,
  Briefcase, HandCoins, FileText, LineChart,
} from 'lucide-react';
import ReportModal from '../components/ModalDenuncia';
import { useAuth } from '../context/ContextoAutenticacao';
import { useDialogo } from '../context/ContextoDialogo';
import { DIAS_SEMANA, PERIODOS, normalizarDisponibilidade } from '../components/DisponibilidadeSemanal';

// Comentários padrão de reputação (estilo iFood/Mercado Livre) por faixa de
// nota — o cálculo da nota em si ainda é mockado (ver reputationScore
// abaixo) até a reputação de usuário ser implementada de verdade.
function reputacaoInfo(score) {
  if (score > 80) {
    return {
      color: 'var(--success-color)',
      label: 'Excelente',
      tags: [
        { tone: 'positivo', text: 'Entrega no prazo combinado' },
        { tone: 'positivo', text: 'Boa comunicação durante o serviço' },
        { tone: 'positivo', text: 'Recomendado por outros usuários' },
      ],
    };
  }
  if (score > 50) {
    return {
      color: 'var(--warning-color)',
      label: 'Regular',
      tags: [
        { tone: 'positivo', text: 'Boa comunicação durante o serviço' },
        { tone: 'alerta', text: 'Já reagendou compromissos algumas vezes' },
      ],
    };
  }
  return {
    color: 'var(--danger-color)',
    label: 'Baixa',
    tags: [
      { tone: 'alerta', text: 'Cancela acordos com frequência' },
      { tone: 'alerta', text: 'Demora para responder mensagens' },
    ],
  };
}

export default function AdDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { alerta } = useDialogo();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [applicationsCount, setApplicationsCount] = useState(null);

  const [ad, setAd] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      const token = localStorage.getItem('token');
      fetch(`http://localhost:8000/api/candidaturas/?user_id=${user.id}`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
           const applied = data.some(app => String(app.anuncio_id) === String(id));
           setHasApplied(applied);
        }
      })
      .catch(err => console.error(err));
    }
  }, [user, id]);

  useEffect(() => {
    fetch(`http://localhost:8000/api/ads/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setAd({
          id: data.id,
          type: data.role,
          title: data.title,
          status_anuncio: data.status_anuncio || 'Em aberto',
          author_id: data.author,
          author: data.author_name || 'Usuário Desconhecido',
          rating: data.author_rating ?? null,
          category: data.category,
          skills: data.skills || [],
          locationType: data.location_type,
          address: data.address || '',
          addressNumber: data.address_number || '',
          city: data.cidade || '',
          state: data.estado || '',
          price: data.price,
          price_unit: data.price_unit,
          description: data.description,
          createdAt: data.created_at,
          deadline: data.deadline || null,
          availability: normalizarDisponibilidade(data.availability),
          reputationScore: 92 // Maintained mock as requested
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching ad detail:', err);
        setAd(null);
        setIsLoading(false);
      });
  }, [id]);

  // Resumo do anunciante (Visualizações/Candidaturas/Dias no ar) só faz
  // sentido carregar para quem publicou o anúncio.
  useEffect(() => {
    if (!user || !ad || user.id !== ad.author_id) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:8000/api/candidaturas/?ad_id=${ad.id}`, {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => (res.ok ? res.json() : []))
      .then(data => setApplicationsCount(Array.isArray(data) ? data.length : 0))
      .catch(err => console.error(err));
  }, [user, ad]);

  const handleSendProposal = (e) => {
    e.preventDefault();
    if (!user) {
      alerta('Você precisa estar logado para se candidatar.', { titulo: 'Login necessário', variante: 'perigo' });
      return;
    }
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/candidaturas/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({
        ad: ad.id,
        mensagem: proposalText,
        valor_proposta: proposalPrice // although 'valor_proposta' is not in model, user put 'proposalPrice'
      })
    })
    .then(res => {
      if (res.ok) {
        console.log("Candidatura enviada com sucesso!");
        setSuccessMessage("Sua candidatura foi enviada, confira em 'minhas candidaturas'");
        setHasApplied(true);
        setIsModalOpen(false);
        setProposalPrice('');
        setProposalText('');
      } else {
        console.error("Erro ao enviar candidatura.");
      }
    })
    .catch(err => {
      console.error(err);
      console.error("Erro de conexão ao enviar candidatura.");
    });
  };

  const handleDeleteAd = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/ads/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`
        }
      });

      if (response.ok) {
        setIsDeleteModalOpen(false);
        navigate('/my-ads');
      } else {
        const errorData = await response.json();
        setDeleteError(errorData.detail || errorData[0] || 'Erro ao excluir o anúncio.');
      }
    } catch (err) {
      console.error(err);
      setDeleteError('Erro de conexão ao tentar excluir.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="card">
          <div className="skeleton" style={{ height: '1.6rem', width: '40%', marginBottom: '1rem' }} />
          <div className="skeleton" style={{ height: '2.2rem', width: '75%', marginBottom: '1.5rem' }} />
          <div className="skeleton" style={{ height: '1rem', width: '55%', marginBottom: '2rem' }} />
          <div className="skeleton" style={{ height: '5rem', width: '100%', marginBottom: '1.5rem' }} />
          <div className="skeleton" style={{ height: '8rem', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (!ad) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Anúncio não encontrado.</div>;
  }

  const isExpired = ad.status_anuncio === 'Vencido';
  const isFreelancerAd = ad.type === 'freelancer';
  const isAuthor = user && user.id === ad.author_id;
  const initial = (ad.author || '?').charAt(0).toUpperCase();
  const rep = reputacaoInfo(ad.reputationScore);
  const diasNoAr = ad.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(ad.createdAt)) / 86400000))
    : null;
  const diasRestantesPrazo = ad.deadline
    ? Math.ceil((new Date(`${ad.deadline}T00:00:00`) - new Date()) / 86400000)
    : null;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {isExpired && (
        <p className="expired-ads-help">Este anúncio expirou e não está mais disponível para novas candidaturas.</p>
      )}

      {successMessage && (
        <div className="form-error" style={{ padding: '1rem', background: 'var(--accent)', color: '#fff', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'bold' }}>
          {successMessage}
        </div>
      )}

      <div className="ad-hero fade-in">
        <div className="ad-hero__chips">
          <span className={`ad-chip ad-type-chip ${ad.type}`}>
            {isFreelancerAd ? <Briefcase size={14} /> : <HandCoins size={14} />}
            {isFreelancerAd ? 'Anúncio de Freelancer' : 'Anúncio de Contratante'}
          </span>
          <span className="ad-chip">
            {ad.locationType === 'remoto' ? <Wifi size={14} /> : <MapPin size={14} />}
            {ad.locationType === 'remoto' ? 'Vaga Remota' : 'Vaga Presencial'}
          </span>
          <span className="ad-chip"><Tag size={14} /> {ad.category}</span>
        </div>

        <h1>{ad.title}</h1>

        <div className="ad-author-row">
          <div className="ad-avatar">{initial}</div>
          <div className="ad-author-row__info">
            <Link to={`/user/${ad.author_id}`} className="ad-author-row__name">{ad.author}</Link>

            <div className="ad-meta-row">
              {ad.rating !== null ? (
                <span className="ad-meta-item rating">
                  <Star size={15} fill="currentColor" /> {ad.rating}
                  <span className="muted">como {isFreelancerAd ? 'freelancer' : 'contratante'}</span>
                </span>
              ) : (
                <span className="ad-meta-item">
                  <Star size={15} /> Sem avaliações como {isFreelancerAd ? 'freelancer' : 'contratante'} ainda
                </span>
              )}
              <span className="ad-meta-item">
                <Calendar size={14} /> Publicado em {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : '—'}
              </span>
              <span className="ad-meta-item">
                {ad.locationType === 'remoto' ? <Wifi size={14} /> : <MapPin size={14} />}
                {ad.locationType === 'remoto' ? 'Serviço remoto' : ([ad.city, ad.state].filter(Boolean).join(' - ') || 'Localização não informada')}
              </span>
            </div>

            {ad.locationType !== 'remoto' && (ad.address || ad.addressNumber) && (
              <div className="ad-address-line">
                <MapPin size={13} /> {[ad.address, ad.addressNumber].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <button onClick={() => setIsReportModalOpen(true)} className="icon-btn-ghost" title="Denunciar Anúncio">
            <Flag size={18} />
          </button>
        </div>
      </div>

      <div className="ad-layout">
        <div className="ad-main">

          <div className="ad-panel">
            <h2 className="ad-panel__heading"><span className="icon-badge"><FileText size={18} /></span>Descrição</h2>
            <p className="body-text">{ad.description}</p>
          </div>

          <div className="ad-panel">
            <h2 className="ad-panel__heading"><span className="icon-badge"><Tags size={18} /></span>Habilidades</h2>
            <div className="chips">
              {ad.skills.map(skill => (
                <span key={skill} className="badge" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>{skill}</span>
              ))}
            </div>
          </div>

          {!isFreelancerAd ? (
            <div className="ad-panel">
              <h2 className="ad-panel__heading"><span className="icon-badge warning"><CalendarClock size={18} /></span>Prazo</h2>
              {ad.deadline ? (
                <span className="deadline-chip">
                  <Clock size={16} />
                  Até {new Date(`${ad.deadline}T00:00:00`).toLocaleDateString()}
                  <span style={{ opacity: 0.8, fontWeight: 500 }}>
                    ({diasRestantesPrazo >= 0 ? `${diasRestantesPrazo} dias restantes` : 'prazo encerrado'})
                  </span>
                </span>
              ) : (
                <p style={{ opacity: 0.7, margin: 0 }}>Nenhum prazo informado.</p>
              )}
            </div>
          ) : (
            <div className="ad-panel">
              <h2 className="ad-panel__heading"><span className="icon-badge"><CalendarDays size={18} /></span>Disponibilidade do freelancer</h2>
              <div className="availability-view availability-grid">
                {DIAS_SEMANA.map(([dia, label]) => (
                  <div key={dia} className="availability-day">
                    <strong>{label}</strong>
                    <div className="availability-periods">
                      {PERIODOS.map(([periodo, periodoLabel]) => (
                        <span key={periodo} className={`availability-option${ad.availability[dia]?.includes(periodo) ? ' selected' : ''}`}>
                          {periodoLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <aside className="ad-sidebar">
          {isAuthor ? (
            <div className="ad-sidebar-card ad-sidebar-card--accent">
              <div className="ad-panel__heading" style={{ marginBottom: '0.75rem' }}>
                <span className="icon-badge sm"><LineChart size={17} /></span>
                <span style={{ fontSize: '1rem' }}>Área do Anunciante</span>
              </div>
              <p style={{ fontSize: '0.85rem', opacity: 0.75, margin: '0 0 0.25rem', lineHeight: 1.5 }}>
                Acompanhe quem se interessou e gerencie sua publicação.
              </p>
              <div className="stat-grid">
                <div className="stat-tile">
                  <span className="icon-badge sm"><Inbox size={16} /></span>
                  <div>
                    <div className="stat-tile__value">{applicationsCount ?? '—'}</div>
                    <div className="stat-tile__label">Candidaturas</div>
                  </div>
                </div>
                <div className="stat-tile">
                  <span className="icon-badge sm"><Clock size={16} /></span>
                  <div>
                    <div className="stat-tile__value">{diasNoAr !== null ? `${diasNoAr} dias` : '—'}</div>
                    <div className="stat-tile__label">No ar</div>
                  </div>
                </div>
              </div>
              <div className="ad-sidebar-actions">
                <Link to={`/my-ads/manage/${ad.id}`} className="btn">Visualizar Candidaturas</Link>
                <Link to={`/edit-ad/${ad.id}`} className="btn btn-secondary" style={{ border: '1px solid var(--border-color)' }}>Editar Anúncio</Link>
                <button
                  onClick={() => { setDeleteError(''); setIsDeleteModalOpen(true); }}
                  className="btn btn-secondary"
                  style={{
                    borderColor: ad.status_anuncio === 'Finalizado' ? 'var(--border-color)' : 'var(--danger-color)',
                    color: ad.status_anuncio === 'Finalizado' ? 'var(--text-secondary)' : 'var(--danger-color)',
                    background: 'transparent',
                    cursor: ad.status_anuncio === 'Finalizado' ? 'not-allowed' : 'pointer',
                  }}
                  disabled={ad.status_anuncio === 'Finalizado'}
                  title={ad.status_anuncio === 'Finalizado' ? 'Anúncios finalizados não podem ser excluídos' : ''}
                >
                  Excluir Anúncio
                </button>
              </div>
              {ad.status_anuncio === 'Finalizado' && (
                <p style={{ fontSize: '0.8rem', color: 'var(--danger-color)', marginTop: '0.75rem' }}>
                  * Este anúncio já foi finalizado e não pode ser excluído.
                </p>
              )}
            </div>
          ) : (
            <div className="ad-sidebar-card ad-sidebar-card--accent">
              <div className="ad-price">
                <div className="ad-price__label">{isFreelancerAd ? 'A partir de' : 'Orçamento'}</div>
                <div className="ad-price__value">
                  R$ {ad.price}
                  {ad.price_unit && ad.price_unit !== 'total' && <small>{ad.price_unit}</small>}
                </div>
              </div>
              <button
                className="ad-cta"
                onClick={() => !hasApplied && !isExpired && setIsModalOpen(true)}
                disabled={hasApplied || isExpired}
              >
                <Star size={18} fill="currentColor" />
                {isExpired ? 'Anúncio expirado' : hasApplied ? 'Candidatura Pendente' : 'Candidatar-se'}
              </button>
            </div>
          )}

          <div className="ad-sidebar-card">
            <div className="ad-panel__heading">
              <span className="icon-badge sm" style={{ color: rep.color, background: `color-mix(in srgb, ${rep.color} 16%, transparent)` }}>
                <ShieldCheck size={17} />
              </span>
              <span style={{ fontSize: '1rem' }}>Reputação</span>
            </div>
            <div className="rep-score-row">
              <div className="rep-score-track">
                <div className="rep-score-marker" style={{ left: `${ad.reputationScore}%`, border: `3px solid ${rep.color}` }} />
              </div>
              <span className="rep-score-label" style={{ color: rep.color }}>{rep.label}</span>
            </div>
            <p className="rep-note">Cálculo a implementar — comentários abaixo resumem o histórico do usuário.</p>
            <div className="reputation-tags">
              {rep.tags.map(tag => (
                <span key={tag.text} className={`reputation-tag ${tag.tone}`}>
                  {tag.tone === 'positivo' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {tag.text}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Proposal Modal */}
      {isModalOpen && (
        <div className="mf-modal-backdrop">
           <div className="mf-modal" style={{ width: '100%', maxWidth: '500px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
              >
                <X size={24} />
              </button>

              <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', paddingRight: '2rem' }}>Enviar Proposta</h2>

              <p style={{ fontSize: '0.95rem', opacity: 0.8, marginBottom: '2rem' }}>
                Apresente-se ao autor do anúncio e descreva por que você é a escolha certa. Se desejar, faça uma contra-proposta de valor.
              </p>

              <form onSubmit={handleSendProposal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div>
                    <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Valor da Proposta (R$)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={`Valor original: R$ ${ad.price}`}
                      value={proposalPrice}
                      onChange={(e) => setProposalPrice(e.target.value)}
                      required
                    />
                 </div>

                 <div>
                    <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Sua Mensagem de Apresentação</label>
                    <textarea
                      className="input"
                      rows="6"
                      placeholder="Olá! Vi o seu anúncio e tenho certeza que posso ajudar com..."
                      value={proposalText}
                      onChange={(e) => setProposalText(e.target.value)}
                      required
                    ></textarea>
                 </div>

                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn dark-text" style={{ flex: 1 }}>Enviar Apresentação</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={ad.id}
        targetName={ad.title}
        type="ad"
      />

      {isDeleteModalOpen && (
        <div className="mf-modal-backdrop">
           <div className="mf-modal" style={{ width: '100%', maxWidth: '450px' }}>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
              >
                <X size={24} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <AlertTriangle size={24} color="var(--danger-color)" />
                  <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--danger-color)' }}>Excluir Anúncio</h2>
              </div>

              <p style={{ fontSize: '0.95rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.5' }}>
                Tem certeza que deseja excluir o anúncio <strong>&quot;{ad.title}&quot;</strong>?
                <br /><br />
                Atenção: Este anúncio continuará contando no limite mensal de anúncios do seu plano de assinatura (<strong>{user?.profile?.subscription_plan || 'Gratuito'}</strong>).
              </p>

              {deleteError && (
                <p className="form-error" style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {deleteError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                 <button type="button" className="btn btn-secondary" style={{ flex: 1, textTransform: 'uppercase', fontSize: '0.85rem', border: '1px solid var(--border-color)', background: 'transparent' }} onClick={() => setIsDeleteModalOpen(false)}>
                   CANCELAR
                 </button>
                 <button type="button" className="btn" style={{ flex: 1, background: 'var(--danger-color)', color: '#FFFFFF', border: 'none', textTransform: 'uppercase', fontSize: '0.85rem' }} onClick={handleDeleteAd}>
                    EXCLUIR ANÚNCIO
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
