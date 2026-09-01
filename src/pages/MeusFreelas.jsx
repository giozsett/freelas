import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Briefcase, User, Calendar, MessageSquare, AlertCircle,
  CheckCircle, ChevronDown, Bell, Check, X, Clock,
  FileText, HelpCircle, TrendingUp, Edit, Star, Ban,
  Wallet, CircleCheck, CircleDot, CircleX
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useNotificacoes } from '../context/ContextoNotificacao';
import { useDialogo } from '../context/ContextoDialogo';

function AgreementSteps({ status, isPaid }) {
  const steps = [
    { key: 'aceito', label: 'Acordo aceito', done: true },
    { key: 'pagamento', label: 'Pagamento', done: isPaid || ['Ativo', 'Concluído'].includes(status) },
    { key: 'andamento', label: 'Em andamento', done: status === 'Concluído' },
    { key: 'conclusao', label: 'Conclusão', done: status === 'Concluído' },
    { key: 'avaliacao', label: 'Avaliação', done: false },
  ];
  const currentIdx = steps.findIndex(s => !s.done);

  return (
    <div className="mf-steps">
      {steps.map((step, i) => (
        <span key={step.key} style={{ display: 'contents' }}>
          <span className={`mf-steps__item ${step.done ? 'mf-steps__item--done' : ''} ${i === currentIdx ? 'mf-steps__item--current' : ''}`}>
            <span className="mf-steps__dot">
              {step.done ? <Check size={10} /> : (i === currentIdx ? <CircleDot size={8} /> : null)}
            </span>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className={`mf-steps__sep ${step.done ? 'mf-steps__sep--done' : ''}`} />}
        </span>
      ))}
    </div>
  );
}
AgreementSteps.propTypes = {
  status: PropTypes.string,
  isPaid: PropTypes.bool,
};

function MoreActionsMenu({ items, buttonLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="mf-more" ref={ref}>
      <button type="button" className="mf-more__btn" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        {buttonLabel || 'Mais ações'} <ChevronDown size={14} />
      </button>
      {open && (
        <div className="mf-more__menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`mf-more__item ${item.danger ? 'mf-more__item--danger' : ''}`}
              onClick={() => { setOpen(false); item.onClick(); }}
              disabled={item.disabled}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
)}
    </div>
  );
}
MoreActionsMenu.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    icon: PropTypes.node,
    onClick: PropTypes.func.isRequired,
    danger: PropTypes.bool,
    disabled: PropTypes.bool,
  })),
  buttonLabel: PropTypes.string,
};

export default function MeusFreelas() {
  const { user } = useAuth();
  const { role } = useRole();
  const { marcarLidas } = useNotificacoes();
  const { confirmar } = useDialogo();
  const navigate = useNavigate();
  const isFreelancer = role === 'freelancer';

  useEffect(() => { marcarLidas(['acordo']); }, [marcarLidas]);

  const [agreements, setAgreements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  const [payingAgreementId, setPayingAgreementId] = useState(null);
  const [concludingAgreementId, setConcludingAgreementId] = useState(null);
  const [agreementTab, setAgreementTab] = useState('ativos');
  const [pendingRequestsExpanded, setPendingRequestsExpanded] = useState(false);
  const [cancellationAgreement, setCancellationAgreement] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [requestingCancellation, setRequestingCancellation] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [valorProposto, setValorProposto] = useState('');
  const [prazoProposto, setPrazoProposto] = useState('');
  const [descricaoProposta, setDescricaoProposta] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const showStatus = useCallback((text, type) => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 5000);
  }, []);

  const handlePayService = async (acordoId) => {
    const checkoutWindow = window.open('', '_blank');
    if (!checkoutWindow) {
      showStatus('Permita pop-ups para abrir o checkout do Mercado Pago em uma nova aba.', 'error');
      return;
    }
    setPayingAgreementId(acordoId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/pagamentos/acordo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify({ acordo_id: acordoId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar o checkout.');
      if (data.checkout_required && data.init_point) {
        checkoutWindow.opener = null;
        checkoutWindow.location.href = data.init_point;
        if (data.test_approved) {
          showStatus('Checkout aberto. Pagamento registrado e freela movido para Em andamento.', 'success');
          fetchAgreements();
        } else {
          showStatus('Checkout aberto. O freela será iniciado após a aprovação do pagamento.', 'success');
        }
        setPayingAgreementId(null);
      } else {
        throw new Error('O Mercado Pago não retornou o endereço do checkout.');
      }
    } catch (err) {
      if (!checkoutWindow.closed) checkoutWindow.close();
      console.error(err);
      showStatus(err.message || 'Erro ao iniciar o pagamento.', 'error');
      setPayingAgreementId(null);
    }
  };

  const handleConcludeAgreement = async (agreement) => {
    const confirmed = await confirmar(
      `Deseja concluir o acordo "${agreement.titulo_anuncio}"? Depois disso, as duas partes poderão enviar suas avaliações.`,
      { titulo: 'Concluir acordo', confirmarTexto: 'Concluir acordo' },
    );
    if (!confirmed) return;
    setConcludingAgreementId(agreement.id);
    try {
      const response = await fetch(`http://localhost:8000/api/acordos/${agreement.id}/concluir/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${localStorage.getItem('token')}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Não foi possível concluir o acordo (HTTP ${response.status}).`);
      navigate(`/my-reviews?acordo=${agreement.id}`);
    } catch (error) {
      showStatus(error.message, 'error');
      setConcludingAgreementId(null);
    }
  };

  const openCancellationModal = (agreement) => {
    setCancellationAgreement(agreement);
    setCancellationReason('');
  };

  const closeCancellationModal = () => {
    if (requestingCancellation) return;
    setCancellationAgreement(null);
    setCancellationReason('');
  };

  const handleRequestCancellation = async (event) => {
    event.preventDefault();
    if (!cancellationAgreement) return;
    setRequestingCancellation(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/acordos/${cancellationAgreement.id}/solicitar-cancelamento/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${localStorage.getItem('token')}` },
          body: JSON.stringify({ justificativa: cancellationReason }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível solicitar o cancelamento.');
      setAgreements(current => current.map(a => a.id === cancellationAgreement.id ? { ...a, cancelamento_pendente: data } : a));
      showStatus('Você enviou sua solicitação de cancelamento. Aguarde a aprovação da moderação.', 'success');
      setCancellationAgreement(null);
      setCancellationReason('');
      fetchAgreements();
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setRequestingCancellation(false);
    }
  };

  const fetchAgreements = useCallback(() => {
    if (!user) { setIsLoading(false); return; }
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/acordos/', {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => { if (!res.ok) throw new Error('Erro ao buscar acordos'); return res.json(); })
    .then(data => { if (Array.isArray(data)) setAgreements(data); setIsLoading(false); })
    .catch(err => {
      console.error('Error fetching agreements, loading mock data:', err);
      setAgreements([
        {
          id: 1, titulo_anuncio: "Desenvolvimento de Landing Page responsiva",
          nome_contratante: "Clínica Pet Feliz", nome_prestador: "Gabriel Silva",
          valor_acordado: 1200.0, descricao_servico: "Criação de landing page responsiva em HTML/CSS/JS com design moderno para petshop.",
          unidade_valor: "Integral", proposta_aceita: "Tenho ampla experiência com web design. Entrego o projeto em 7 dias com suporte gratuito.",
          data_confirmacao: "2026-06-15T10:00:00Z", conclusao_prevista: "2026-06-30", status_acordo: "Ativo",
          tem_solicitacao: true, solicitado_por: isFreelancer ? 'contratante' : 'freelancer',
          justificativa_alteracao: "Precisamos incluir uma seção de galeria de fotos e formulário de agendamento avançado no escopo do serviço.",
          proposto_valor: 1600.0, proposta_descricao: "Criação de landing page responsiva + seção galeria de fotos + formulário de agendamento integrado.",
          proposta_conclusao_prevista: "2026-07-08", anuncio_id: 1, freelancer_id: 2, contratante_id: 3
        },
        {
          id: 2, titulo_anuncio: "Adestramento Avançado de Cães",
          nome_contratante: !isFreelancer ? user?.profile?.nome_completo || "Você" : "Carlos Souza",
          nome_prestador: isFreelancer ? user?.profile?.nome_completo || "Você" : "Mariana Silva",
          valor_acordado: 85.0, descricao_servico: "Sessões semanais de adestramento com foco em comportamento de socialização.",
          unidade_valor: "Hora", proposta_aceita: "Posso realizar 2 sessões por semana na residência, focando em comandos de obediência básica.",
          data_confirmacao: "2026-05-10T14:30:00Z", conclusao_prevista: "2026-06-10", status_acordo: "Concluido",
          tem_solicitacao: false, anuncio_id: 2
        },
        {
          id: 3, titulo_anuncio: "Consultoria Nutricional para Gatos",
          nome_contratante: "Julia Santos", nome_prestador: "Dra. Paula Lima",
          valor_acordado: 250.0, descricao_servico: "Elaboração de plano alimentar personalizado para felinos obesos.",
          unidade_valor: "Integral", proposta_aceita: "Ofereço consulta completa e entrega do cardápio detalhado em até 3 dias úteis.",
          data_confirmacao: "2026-04-01T09:00:00Z", conclusao_prevista: "2026-04-10", status_acordo: "Cancelado",
          tem_solicitacao: false, anuncio_id: 3
        }
      ]);
      setIsLoading(false);
    });
  }, [isFreelancer, user]);

  useEffect(() => { fetchAgreements(); }, [fetchAgreements]);

  const isContractorOfAgreement = (app) => {
    if (app.contratante_id && user?.id) return Number(app.contratante_id) === Number(user.id);
    return !isFreelancer;
  };

  const userRoleInAgreement = (app) => isContractorOfAgreement(app) ? 'contratante' : 'freelancer';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (checkout === 'success') showStatus('Pagamento enviado. Aguardando a confirmação do Mercado Pago.', 'success');
      else if (checkout === 'pending') showStatus('O pagamento está em análise no Mercado Pago.', 'success');
      else showStatus('O pagamento não foi concluído. Você pode tentar novamente.', 'error');
      fetchAgreements();
    }
  }, [fetchAgreements, showStatus]);

  const toggleExpand = (id) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

  const handleOpenModal = (agreement) => {
    setSelectedAgreement(agreement);
    setValorProposto(agreement.valor_acordado);
    setPrazoProposto(agreement.conclusao_prevista || '');
    setDescricaoProposta(agreement.descricao_servico || '');
    setJustificativa('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setSelectedAgreement(null); };

  const handleSubmitSolicitacao = (e) => {
    e.preventDefault();
    if (!selectedAgreement) return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:8000/api/acordos/${selectedAgreement.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
      body: JSON.stringify({
        tem_solicitacao: true, justificativa_alteracao: justificativa,
        proposto_valor: parseFloat(valorProposto) || null,
        proposta_descricao: descricaoProposta,
        proposta_conclusao_prevista: prazoProposto || null
      })
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || 'Não foi possível enviar a solicitação.');
      showStatus('Solicitação de alteração enviada com sucesso!', 'success');
      fetchAgreements();
      handleCloseModal();
    })
    .catch(err => { console.error(err); showStatus('Erro ao enviar solicitação.', 'error'); });
  };

  const handleDecidirSolicitacao = (agreementId, approved) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:8000/api/acordos/${agreementId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
      body: JSON.stringify(approved ? { "aprovar_solicitacao": true } : { "recusar_solicitacao": true })
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || 'Não foi possível processar a decisão.');
      showStatus(approved ? 'Alterações aprovadas e aplicadas!' : 'Solicitação de alteração recusada.', 'success');
      fetchAgreements();
    })
    .catch(err => { console.error(err); showStatus('Erro ao processar decisão.', 'error'); });
  };

  const pendingPaymentAgreements = agreements.filter(app => app.status_acordo === 'Pendente Pagamento');
  const activeAgreements = agreements.filter(app => app.status_acordo === 'Ativo');
  const completedAgreements = agreements.filter(app => app.status_acordo === 'Concluído');
  const cancelledAgreements = agreements.filter(app => app.status_acordo === 'Cancelado');
  const historyAgreements = agreementTab === 'concluidos' ? completedAgreements : cancelledAgreements;

  const receivedRequests = agreements.filter(app => (
    app.tem_solicitacao && app.solicitado_por !== userRoleInAgreement(app)
  ));

  const attentionCount = pendingPaymentAgreements.length + receivedRequests.length;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

      {/* Status toast */}
      {statusMsg.text && (
        <div role="status" aria-live="polite" style={{
          background: statusMsg.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
          borderLeft: `4px solid ${statusMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`,
          padding: '1rem', borderRadius: '10px',
          color: statusMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
          fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
          position: 'fixed', top: '5.5rem', right: '1rem', zIndex: 1200,
          width: 'min(420px, calc(100vw - 2rem))', boxShadow: '0 8px 24px var(--shadow-color)',
          backdropFilter: 'blur(10px)', animation: 'fadeInDown 0.3s ease both',
        }}>
          {statusMsg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {statusMsg.text}
        </div>
      )}

      {/* Page header */}
      <div className="mf-page-header">
        <div className="mf-page-header__main">
          <div className="mf-page-header__icon">
            <Briefcase size={26} />
          </div>
          <div>
            <h1>Meus Freelas</h1>
            <p className="mf-page-header__desc">
              Gerencie seus acordos de serviço em andamento, concluídos e cancelados.
            </p>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mf-summary">
        <div className={`mf-summary__item ${pendingPaymentAgreements.length > 0 ? 'mf-summary__item--atencao' : ''}`}>
          <div className="mf-summary__icon mf-summary__icon--warning"><Wallet size={18} /></div>
          <div>
            <div className="mf-summary__value">{pendingPaymentAgreements.length}</div>
            <div className="mf-summary__label">Aguardando Pagamento</div>
          </div>
        </div>
        <div className="mf-summary__item">
          <div className="mf-summary__icon mf-summary__icon--muted"><CircleDot size={18} /></div>
          <div>
            <div className="mf-summary__value">{activeAgreements.length}</div>
            <div className="mf-summary__label">Em Andamento</div>
          </div>
        </div>
        <div className="mf-summary__item">
          <div className="mf-summary__icon mf-summary__icon--success"><CircleCheck size={18} /></div>
          <div>
            <div className="mf-summary__value">{completedAgreements.length}</div>
            <div className="mf-summary__label">Concluídos</div>
          </div>
        </div>
        <div className="mf-summary__item">
          <div className="mf-summary__icon mf-summary__icon--danger"><CircleX size={18} /></div>
          <div>
            <div className="mf-summary__value">{cancelledAgreements.length}</div>
            <div className="mf-summary__label">Cancelados</div>
          </div>
        </div>
      </div>

      {/* Segmented tabs */}
      <div className="mf-tabs">
        {[
          ['ativos', 'Em andamento', pendingPaymentAgreements.length + activeAgreements.length],
          ['concluidos', 'Concluídos', completedAgreements.length],
          ['cancelados', 'Cancelados', cancelledAgreements.length],
        ].map(([tab, label, count]) => (
          <button
            key={tab}
            type="button"
            className={`mf-tab ${agreementTab === tab ? 'mf-tab--active' : ''}`}
            onClick={() => setAgreementTab(tab)}
          >
            {label}
            <span className="mf-tab__count">{count}</span>
          </button>
        ))}
      </div>

      {/* Attention panel */}
      {attentionCount > 0 && agreementTab === 'ativos' && (
        <div className="mf-attention">
          <button type="button" className="mf-attention__header" onClick={() => setPendingRequestsExpanded(v => !v)} aria-expanded={pendingRequestsExpanded}>
            <span className="mf-attention__title">
              <Bell size={19} /> Requer sua atenção ({attentionCount})
            </span>
            <ChevronDown size={18} style={{ transform: pendingRequestsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }} />
          </button>

          {pendingRequestsExpanded && (
            <div className="mf-attention__list">
              {receivedRequests.map(app => (
                <div key={app.id} className="mf-attention__card" style={{ borderLeftColor: 'var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="mf-card__badges">
                        <span className="badge" style={{ background: 'var(--primary)', color: 'var(--role-contrast)' }}>Pendente de Aprovação</span>
                      </div>
                      <h4 style={{ margin: '0.25rem 0 0.35rem', fontSize: '1.1rem' }}>{app.titulo_anuncio}</h4>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                        Solicitado por: <strong style={{ color: 'var(--text-color)' }}>{app.solicitado_por === 'freelancer' ? 'Freelancer' : 'Contratante'}</strong>
                      </p>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Justificativa: <em>{`"${app.justificativa_alteracao || 'Não informada'}"`}</em>
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.86rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Orçamento:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>R$ {app.valor_acordado}</span>
                            <span style={{ color: 'var(--success-color)', fontWeight: 'bold' }}><TrendingUp size={13} style={{ display: 'inline' }} /> R$ {app.proposto_valor}</span>
                          </div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Prazo:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>
                              {app.conclusao_prevista ? new Date(app.conclusao_prevista + 'T00:00:00').toLocaleDateString() : '—'}
                            </span>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                              {app.proposta_conclusao_prevista ? new Date(app.proposta_conclusao_prevista + 'T00:00:00').toLocaleDateString() : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button type="button" onClick={() => handleDecidirSolicitacao(app.id, false)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                        <X size={14} /> Recusar
                      </button>
                      <button type="button" onClick={() => handleDecidirSolicitacao(app.id, true)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}>
                        <Check size={14} /> Aprovar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Ativos Tab ─── */}
      {agreementTab === 'ativos' && (
        <>
          {/* Pending payment section */}
          {pendingPaymentAgreements.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pending-accent)' }}>
                <Wallet size={20} /> Aguardando Pagamento ({pendingPaymentAgreements.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {pendingPaymentAgreements.map(app => {
                  const userIsContractor = isContractorOfAgreement(app);
                  return (
                    <div key={app.id} className="mf-card mf-card--pending">
                      <div className="mf-card__summary">
                        <div style={{ minWidth: 0 }}>
                          <div className="mf-card__badges">
                            <span className="badge" style={{ background: 'var(--pending-accent)', color: 'var(--pending-accent-contrast)', fontSize: '0.75rem' }}>Pendente de Pagamento</span>
                            <span className="badge role-badge" style={{ fontSize: '0.75rem' }}>
                              Seu Papel: {userIsContractor ? 'Contratante' : 'Freelancer'}
                            </span>
                            {app.cancelamento_pendente && (
                              <span className="badge" style={{ background: 'var(--danger-color)', color: 'var(--danger-contrast)', fontSize: '0.75rem' }}>
                                <Ban size={11} /> Cancelamento Pendente
                              </span>
                            )}
                          </div>
                          <h3 className="mf-card__title">{app.titulo_anuncio}</h3>
                          <div className="mf-card__meta">
                            <span><User size={14} /> <strong>Contratante:</strong> {app.nome_contratante || '—'}</span>
                            <span><User size={14} /> <strong>Freelancer:</strong> {app.nome_prestador || '—'}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            {userIsContractor
                              ? 'Para ativar este acordo, conclua o pagamento no checkout seguro do Mercado Pago.'
                              : 'Aguardando o contratante concluir o pagamento para iniciar o projeto.'}
                          </p>
                        </div>
                        <div className="mf-card__price">
                          <div className="mf-card__price-label">Valor do Serviço</div>
                          <div className="mf-card__price-value">
                            {Number(app.valor_acordado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      </div>

                      <div className="mf-card__body" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                        <div className="mf-actions">
                          {userIsContractor ? (
                            <button
                              type="button"
                              onClick={() => handlePayService(app.id)}
                              className="btn"
                              disabled={payingAgreementId !== null || Boolean(app.cancelamento_pendente)}
                              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                            >
                              {payingAgreementId === app.id ? 'Abrindo checkout...' : 'Pagar Agora'}
                            </button>
                          ) : (
                            <div className="mf-chip" style={{ fontSize: '0.84rem', color: 'var(--pending-accent)' }}>
                              <Clock size={14} /> Aguardando pagamento
                            </div>
                          )}
                          {!app.cancelamento_pendente && (
                            <MoreActionsMenu items={[
                              { icon: <Edit size={15} />, label: 'Solicitar alteração', onClick: () => handleOpenModal(app), disabled: Boolean(app.tem_solicitacao) },
                              { icon: <Ban size={15} />, label: 'Solicitar cancelamento', onClick: () => openCancellationModal(app), danger: true },
                            ]} buttonLabel="Mais ações" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active agreements section */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CircleDot size={20} style={{ color: 'var(--primary)' }} /> Em Andamento ({activeAgreements.length})
            </h2>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', opacity: 0.6 }}>
                <Clock size={20} className="animate-spin" style={{ display: 'inline', marginRight: '8px', animation: 'spin 1s linear infinite' }} /> Carregando seus serviços...
              </div>
            ) : activeAgreements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {activeAgreements.map(app => {
                  const isExpanded = expandedCards[app.id];
                  const userIsContractor = isContractorOfAgreement(app);
                  const isPaid = Boolean(app.status_acordo === 'Ativo');
                  return (
                    <div key={app.id} className="mf-card mf-card--completed">
                      {/* Collapsed summary */}
                      <div className="mf-card__summary" onClick={() => toggleExpand(app.id)}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="mf-card__badges">
                            <span className="badge role-badge" style={{ fontSize: '0.75rem' }}>
                              Seu Papel: {userIsContractor ? 'Contratante' : 'Freelancer'}
                            </span>
                            {app.tem_solicitacao && (
                              <span className="badge" style={{ background: 'var(--warning-soft)', color: 'var(--warning-color)', fontSize: '0.75rem' }}>
                                <Bell size={11} /> Alteração Pendente
                              </span>
                            )}
                            {app.cancelamento_pendente && (
                              <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger-color)', fontSize: '0.75rem' }}>
                                <Ban size={11} /> Cancelamento Pendente
                              </span>
                            )}
                          </div>
                          <h3 className="mf-card__title">{app.titulo_anuncio}</h3>
                          <div className="mf-card__meta">
                            <span><User size={14} /> <strong>Contratante:</strong> {app.nome_contratante || '—'}</span>
                            <span><User size={14} /> <strong>Freelancer:</strong> {app.nome_prestador || '—'}</span>
                            <span><Calendar size={14} /> Prazo: <strong>{app.conclusao_prevista ? new Date(app.conclusao_prevista + 'T00:00:00').toLocaleDateString() : '—'}</strong></span>
                          </div>
                          <div className="mf-card__next">
                            Próxima ação: <strong>
                              {userIsContractor ? 'Marcar como concluído' : 'Aguardar conclusão'}
                            </strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                          <div className="mf-card__price">
                            <div className="mf-card__price-label">Valor do Acordo</div>
                            <div className="mf-card__price-value">
                              R$ {app.valor_acordado}
                            </div>
                            <div className="mf-card__price-unit">/ {app.unidade_valor}</div>
                          </div>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem', transition: 'transform 0.2s ease' }}
                            aria-label={isExpanded ? 'Recolher card' : 'Expandir card'}
                          >
                            <ChevronDown size={22} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded body */}
                      <div className={`mf-card__expand ${isExpanded ? 'mf-card__expand--open' : ''}`}>
                        {isExpanded && (
                          <div className="mf-card__body">
                            {/* Progress steps */}
                            <AgreementSteps status={app.status_acordo} isPaid={isPaid} />

                            {/* Detail grid */}
                            <div className="mf-detail-grid">
                              <div className="mf-detail-box">
                                <h4><FileText size={14} /> Descrição dos Serviços Acordados</h4>
                                <p>{app.descricao_servico}</p>
                              </div>
                              <div className="mf-detail-box">
                                <h4><HelpCircle size={14} /> Proposta Comercial Aceita</h4>
<p style={{ fontStyle: 'italic' }}>{`"${app.proposta_aceita}"`}</p>
                              </div>
                            </div>

                            <div className="mf-chip">
                              <Calendar size={16} color="var(--primary)" />
                              Previsão de Conclusão: <strong>{app.conclusao_prevista ? new Date(app.conclusao_prevista + 'T00:00:00').toLocaleDateString() : '—'}</strong>
                            </div>

                            {/* Pending change request notice */}
                            {app.tem_solicitacao && (
                              <div style={{
                                background: 'var(--warning-soft)', border: '1px solid var(--warning-color)',
                                borderRadius: '10px', padding: '0.9rem 1rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                  <Clock size={15} /> {app.solicitado_por === userRoleInAgreement(app)
                                    ? 'Você solicitou alterações neste acordo'
                                    : 'Alterações solicitadas pela outra parte'}
                                </div>
                                <p style={{ margin: '0 0 0.3rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                                  <strong>Justificativa:</strong> {`"${app.justificativa_alteracao}"`}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                                  <strong>Novos valores:</strong> R$ {app.proposto_valor} | Conclusão em{' '}
                                  {app.proposta_conclusao_prevista ? new Date(app.proposta_conclusao_prevista + 'T00:00:00').toLocaleDateString() : '—'}
                                </p>
                                {app.solicitado_por !== userRoleInAgreement(app) && (
                                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem' }}>
                                    <button onClick={() => handleDecidirSolicitacao(app.id, false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>Recusar</button>
                                    <button onClick={() => handleDecidirSolicitacao(app.id, true)} className="btn" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>Aprovar</button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Pending cancellation */}
                            {app.cancelamento_pendente && (
                              <div style={{
                                background: 'var(--danger-soft)', border: '1px solid var(--danger-color)',
                                borderRadius: '10px', padding: '0.9rem 1rem'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                  <Ban size={15} /> Cancelamento pendente
                                </div>
                                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                                  Aguardando aprovação da moderação. Justificativa: {`"${app.cancelamento_pendente.justificativa}"`}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="mf-actions">
                              {app.status_acordo === 'Pendente Pagamento' && userIsContractor && (
                                <button
                                  type="button"
                                  onClick={() => handlePayService(app.id)}
                                  className="btn"
                                  disabled={payingAgreementId !== null || Boolean(app.cancelamento_pendente)}
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  <Wallet size={15} /> {payingAgreementId === app.id ? 'Abrindo checkout...' : 'Pagar Agora'}
                                </button>
                              )}
                              <Link to={`/chat/${app.id}`} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                                <MessageSquare size={15} /> Abrir Conversa
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleOpenModal(app)}
                                className="btn btn-secondary"
                                disabled={Boolean(app.tem_solicitacao)}
                                style={{ fontSize: '0.85rem' }}
                              >
                                <Edit size={15} /> {app.tem_solicitacao ? 'Alteração Pendente' : 'Solicitar Alterações'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openCancellationModal(app)}
                                className="btn btn-secondary"
                                disabled={Boolean(app.cancelamento_pendente)}
                                style={{ fontSize: '0.85rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                              >
                                <Ban size={15} /> {app.cancelamento_pendente ? 'Cancelamento Pendente' : 'Solicitar Cancelamento'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConcludeAgreement(app)}
                                className="btn"
                                disabled={concludingAgreementId !== null || Boolean(app.cancelamento_pendente)}
                                style={{ fontSize: '0.85rem' }}
                              >
                                <CheckCircle size={15} />
                                {concludingAgreementId === app.id ? 'Concluindo...' : 'Concluir Acordo'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mf-empty">
                <div className="mf-empty__icon"><CheckCircle size={30} /></div>
                <h3>Nenhum acordo em andamento</h3>
                <p>Aprove propostas nas suas candidaturas ou anúncios para iniciar uma parceria.</p>
                <Link to="/" className="btn">Navegar por Anúncios</Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── History Tab ─── */}
      {agreementTab !== 'ativos' && (
        <div>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.85 }}>
            {agreementTab === 'concluidos' ? <CircleCheck size={20} style={{ color: 'var(--success-color)' }} /> : <CircleX size={20} style={{ color: 'var(--danger-color)' }} />}
            {agreementTab === 'concluidos' ? 'Concluídos' : 'Cancelados'} ({historyAgreements.length})
          </h2>

          {historyAgreements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {historyAgreements.map(app => {
                const isExpanded = expandedCards[app.id];
                const isConcluido = app.status_acordo.toLowerCase().includes('conclui');
                const statusClass = isConcluido ? 'mf-card--completed' : 'mf-card--cancelled';

                return (
                  <div key={app.id} className={`mf-card ${statusClass}`}>
                    <div className="mf-card__summary" onClick={() => toggleExpand(app.id)}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="mf-card__badges">
                          <span className={`badge ${isConcluido ? 'history-status-badge completed' : 'history-status-badge cancelled'}`} style={{ fontSize: '0.75rem' }}>
                            {app.status_acordo}
                          </span>
                          <span className="badge role-badge" style={{ fontSize: '0.75rem' }}>
                            Seu Papel: {isContractorOfAgreement(app) ? 'Contratante' : 'Freelancer'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {isConcluido ? 'Finalizado' : 'Cancelado'} em:{' '}
                            {(isConcluido ? app.concluido_em : app.cancelado_em)
                              ? new Date(isConcluido ? app.concluido_em : app.cancelado_em).toLocaleDateString()
                              : '—'}
                          </span>
                        </div>
                        <h3 className="mf-card__title" style={{ fontSize: '1.15rem', fontWeight: 500 }}>{app.titulo_anuncio}</h3>
                        <div className="mf-card__meta">
                          <span><User size={13} /> <strong>Contratante:</strong> {app.nome_contratante || '—'}</span>
                          <span><User size={13} /> <strong>Freelancer:</strong> {app.nome_prestador || '—'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                        <div className="mf-card__price">
                          <div className="mf-card__price-label">Valor Final</div>
                          <div className="mf-card__price-value" style={{ fontSize: '1.15rem' }}>R$ {app.valor_acordado}</div>
                        </div>
                        <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem' }} aria-label={isExpanded ? 'Recolher' : 'Expandir'}>
                          <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </button>
                      </div>
                    </div>

                    <div className={`mf-card__expand ${isExpanded ? 'mf-card__expand--open' : ''}`}>
                      {isExpanded && (
                        <div className="mf-card__body">
                          <div className="mf-detail-grid">
                            <div className="mf-detail-box">
                              <h4><FileText size={14} /> Descrição do Serviço</h4>
                              <p>{app.descricao_servico}</p>
                            </div>
                            <div className="mf-detail-box">
                              <h4><HelpCircle size={14} /> Proposta Comercial</h4>
                              <p style={{ fontStyle: 'italic' }}>{`"${app.proposta_aceita}"`}</p>
                            </div>
                          </div>
                          <div className="mf-actions">
                            {isConcluido && !app.avaliacao_enviada && (
                              <Link to={`/my-reviews?acordo=${app.id}`} className="btn" style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}>
                                <Star size={14} /> Avaliar Agora
                              </Link>
                            )}
                            <Link to={`/chat/${app.id}`} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}>
                              <MessageSquare size={14} /> Histórico de Chat
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mf-empty">
              <div className="mf-empty__icon">
                {agreementTab === 'concluidos' ? <CheckCircle size={30} /> : <Ban size={30} />}
              </div>
              <h3>{agreementTab === 'concluidos' ? 'Nenhum acordo concluído' : 'Nenhum acordo cancelado'}</h3>
              <p>
                {agreementTab === 'concluidos'
                  ? 'Acordos finalizados aparecerão aqui.'
                  : 'Acordos cancelados aparecerão aqui.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Change Request Modal ─── */}
      {isModalOpen && selectedAgreement && (
        <div className="mf-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
          <div className="mf-modal">
            <button type="button" onClick={handleCloseModal} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', transition: 'color 0.15s ease' }} aria-label="Fechar">
              <X size={22} />
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit size={22} color="var(--primary)" /> Solicitar Alterações
            </h2>
            <p style={{ opacity: 0.75, fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Proponha novos termos para o acordo <strong>{selectedAgreement.titulo_anuncio}</strong>.
            </p>

            <form onSubmit={handleSubmitSolicitacao} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.92rem' }}>
                  Justificativa da Alteração <span style={{ color: 'var(--danger-color)' }}>*</span>
                </label>
                <textarea
                  className="input" rows="3" required
                  placeholder="Explique o motivo da alteração de escopo, prazo ou valor..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.92rem' }}>Novo Orçamento (R$)</label>
                  <input type="number" step="0.01" className="input" placeholder="Ex: 1500.00"
                    value={valorProposto} onChange={(e) => setValorProposto(e.target.value)} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Atual: R$ {selectedAgreement.valor_acordado}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.92rem' }}>Nova Previsão Conclusão</label>
                  <input type="date" className="input custom-date-input"
                    value={prazoProposto} onChange={(e) => setPrazoProposto(e.target.value)} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Atual: {selectedAgreement.conclusao_prevista || '—'}</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.92rem' }}>Nova Descrição / Escopo</label>
                <textarea className="input" rows="4"
                  placeholder="Altere o escopo do serviço se necessário..."
                  value={descricaoProposta} onChange={(e) => setDescricaoProposta(e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn">Enviar Solicitação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Cancellation Modal ─── */}
      {cancellationAgreement && (
        <div className="mf-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeCancellationModal(); }}>
          <div className="mf-modal" style={{ borderTopColor: 'var(--danger-color)' }}>
            <button type="button" onClick={closeCancellationModal} disabled={requestingCancellation}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }} aria-label="Fechar">
              <X size={22} />
            </button>
            <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ban size={22} color="var(--danger-color)" /> Solicitar Cancelamento
            </h2>
            <p style={{ opacity: 0.75, lineHeight: 1.5, fontSize: '0.9rem' }}>
              O acordo <strong>{cancellationAgreement.titulo_anuncio}</strong> continuará com o status atual até que um administrador analise a solicitação.
            </p>
            {cancellationAgreement.status_acordo === 'Ativo' && (
              <div style={{ background: 'var(--warning-soft)', borderLeft: '4px solid var(--warning-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.84rem' }}>
                A aprovação cancela o acordo na plataforma, mas não realiza automaticamente um estorno de pagamento já aprovado.
              </div>
            )}
            <form onSubmit={handleRequestCancellation}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem', fontSize: '0.92rem' }}>Justificativa</label>
              <textarea className="input" rows="5" minLength="10" required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Explique o motivo do cancelamento para análise administrativa..."
                style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeCancellationModal} disabled={requestingCancellation}>Voltar</button>
                <button type="submit" className="btn" disabled={requestingCancellation} style={{ background: 'var(--danger-color)', color: 'var(--danger-contrast)' }}>
                  {requestingCancellation ? 'Enviando...' : 'Enviar para o administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
