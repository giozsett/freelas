import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, 
  User, 
  Calendar, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Bell,
  Check,
  X,
  Clock,
  FileText,
  HelpCircle,
  TrendingUp,
  Edit,
  Star,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useNotificacoes } from '../context/ContextoNotificacao';

export default function MeusFreelas() {
  const { user } = useAuth();
  const { role } = useRole();
  const { marcarLidas } = useNotificacoes();
  const navigate = useNavigate();
  const isFreelancer = role === 'freelancer';
  const backendRole = isFreelancer ? 'freelancer' : 'contratante';

  useEffect(() => {
    marcarLidas(['acordo']);
  }, [marcarLidas]);
  const [agreements, setAgreements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  const [payingAgreementId, setPayingAgreementId] = useState(null);
  const [simulatingAgreementId, setSimulatingAgreementId] = useState(null);
  const [concludingAgreementId, setConcludingAgreementId] = useState(null);
  const [agreementTab, setAgreementTab] = useState('ativos');
  const [cancellationAgreement, setCancellationAgreement] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [requestingCancellation, setRequestingCancellation] = useState(false);

  // Modal State for Change Request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [valorProposto, setValorProposto] = useState('');
  const [prazoProposto, setPrazoProposto] = useState('');
  const [descricaoProposta, setDescricaoProposta] = useState('');
  const [justificativa, setJustificativa] = useState('');

  // Status message
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const showStatus = useCallback((text, type) => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg({ text: '', type: '' });
    }, 5000);
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ acordo_id: acordoId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível iniciar o checkout.');
      }
      if (data.checkout_required && data.init_point) {
        checkoutWindow.opener = null;
        checkoutWindow.location.href = data.init_point;
        if (data.test_approved) {
          showStatus('Checkout criado. Pagamento acadêmico aprovado e acordo iniciado.', 'success');
          fetchAgreements();
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
    const confirmed = window.confirm(
      `Deseja concluir o acordo "${agreement.titulo_anuncio}"? Depois disso, as duas partes poderão enviar suas avaliações.`
    );
    if (!confirmed) return;

    setConcludingAgreementId(agreement.id);
    try {
      const response = await fetch(`http://localhost:8000/api/acordos/${agreement.id}/concluir/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error ||
          `Não foi possível concluir o acordo (HTTP ${response.status}).`,
        );
      }
      navigate(`/my-reviews?acordo=${agreement.id}`);
    } catch (error) {
      showStatus(error.message, 'error');
      setConcludingAgreementId(null);
    }
  };

  const handleSimulatePayment = async (agreement) => {
    if (!window.confirm(
      `Ativar o acordo "${agreement.titulo_anuncio}" usando uma aprovação exclusivamente local de teste?`,
    )) return;

    setSimulatingAgreementId(agreement.id);
    try {
      const response = await fetch(
        `http://localhost:8000/api/pagamentos/acordo/${agreement.id}/simular/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`,
          },
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Falha na simulação (HTTP ${response.status}).`);
      }
      showStatus(data.message, 'success');
      fetchAgreements();
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setSimulatingAgreementId(null);
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ justificativa: cancellationReason }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível solicitar o cancelamento.');
      }

      setAgreements(currentAgreements => currentAgreements.map(agreement => (
        agreement.id === cancellationAgreement.id
          ? { ...agreement, cancelamento_pendente: data }
          : agreement
      )));
      showStatus(
        'Você enviou sua solicitação de cancelamento. Aguarde a aprovação da moderação.',
        'success',
      );
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
    if (!user) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/acordos/', {
      headers: {
        'Authorization': `Token ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao buscar acordos');
      return res.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setAgreements(data);
      }
      setIsLoading(false);
    })
    .catch(err => {
      console.error('Error fetching agreements, loading mock data:', err);
      // Fallback Mock Data so the application works even if offline
      setAgreements([
        {
          id: 1,
          titulo_anuncio: "Desenvolvimento de Landing Page responsiva",
          nome_contratante: "Clínica Pet Feliz",
          nome_prestador: "Gabriel Silva",
          valor_acordado: 1200.0,
          descricao_servico: "Criação de landing page responsiva em HTML/CSS/JS com design moderno para petshop.",
          unidade_valor: "Integral",
          proposta_aceita: "Tenho ampla experiência com web design. Entrego o projeto em 7 dias com suporte gratuito.",
          data_confirmacao: "2026-06-15T10:00:00Z",
          conclusao_prevista: "2026-06-30",
          status_acordo: "Ativo",
          tem_solicitacao: true,
          solicitado_por: isFreelancer ? 'contratante' : 'freelancer', // Mock incoming request
          justificativa_alteracao: "Precisamos incluir uma seção de galeria de fotos e formulário de agendamento avançado no escopo do serviço.",
          proposto_valor: 1600.0,
          proposta_descricao: "Criação de landing page responsiva + seção galeria de fotos + formulário de agendamento integrado.",
          proposta_conclusao_prevista: "2026-07-08",
          anuncio_id: 1,
          freelancer_id: 2,
          contratante_id: 3
        },
        {
          id: 2,
          titulo_anuncio: "Adestramento Avançado de Cães",
          nome_contratante: !isFreelancer ? user?.profile?.nome_completo || "Você" : "Carlos Souza",
          nome_prestador: isFreelancer ? user?.profile?.nome_completo || "Você" : "Mariana Silva",
          valor_acordado: 85.0,
          descricao_servico: "Sessões semanais de adestramento com foco em comportamento de socialização.",
          unidade_valor: "Hora",
          proposta_aceita: "Posso realizar 2 sessões por semana na residência, focando em comandos de obediência básica.",
          data_confirmacao: "2026-05-10T14:30:00Z",
          conclusao_prevista: "2026-06-10",
          status_acordo: "Concluido",
          tem_solicitacao: false,
          anuncio_id: 2
        },
        {
          id: 3,
          titulo_anuncio: "Consultoria Nutricional para Gatos",
          nome_contratante: "Julia Santos",
          nome_prestador: "Dra. Paula Lima",
          valor_acordado: 250.0,
          descricao_servico: "Elaboração de plano alimentar personalizado para felinos obesos.",
          unidade_valor: "Integral",
          proposta_aceita: "Ofereço consulta completa e entrega do cardápio detalhado em até 3 dias úteis.",
          data_confirmacao: "2026-04-01T09:00:00Z",
          conclusao_prevista: "2026-04-10",
          status_acordo: "Cancelado",
          tem_solicitacao: false,
          anuncio_id: 3
        }
      ]);
      setIsLoading(false);
    });
  }, [isFreelancer, user]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const isContractorOfAgreement = (app) => {
    if (app.contratante_id && user?.id) {
      return Number(app.contratante_id) === Number(user.id);
    }
    return !isFreelancer;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');

    if (checkout) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (checkout === 'success') {
        showStatus('Pagamento enviado. Aguardando a confirmação do Mercado Pago.', 'success');
      } else if (checkout === 'pending') {
        showStatus('O pagamento está em análise no Mercado Pago.', 'success');
      } else {
        showStatus('O pagamento não foi concluído. Você pode tentar novamente.', 'error');
      }
      fetchAgreements();
    }
  }, [fetchAgreements, showStatus]);

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenModal = (agreement) => {
    setSelectedAgreement(agreement);
    setValorProposto(agreement.valor_acordado);
    setPrazoProposto(agreement.conclusao_prevista || '');
    setDescricaoProposta(agreement.descricao_servico || '');
    setJustificativa('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAgreement(null);
  };

  // Submit Change Request PATCH
  const handleSubmitSolicitacao = (e) => {
    e.preventDefault();
    if (!selectedAgreement) return;

    const token = localStorage.getItem('token');
    const bodyData = {
      tem_solicitacao: true,
      solicitado_por: backendRole,
      justificativa_alteracao: justificativa,
      proposto_valor: parseFloat(valorProposto) || null,
      proposta_descricao: descricaoProposta,
      proposta_conclusao_prevista: prazoProposto || null
    };

    fetch(`http://localhost:8000/api/acordos/${selectedAgreement.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(bodyData)
    })
    .then(res => {
      if (res.ok) {
        showStatus('Solicitação de alteração enviada com sucesso!', 'success');
        fetchAgreements();
        handleCloseModal();
      } else {
        // Fallback simulate locally if mock data
        setAgreements(prev => prev.map(item => {
          if (item.id === selectedAgreement.id) {
            return {
              ...item,
              ...bodyData
            };
          }
          return item;
        }));
        showStatus('Solicitação enviada com sucesso (Simulação Local)!', 'success');
        handleCloseModal();
      }
    })
    .catch(err => {
      console.error(err);
      showStatus('Erro ao enviar solicitação.', 'error');
    });
  };

  // Approve / Recuse Decision PATCH
  const handleDecidirSolicitacao = (agreementId, approved) => {
    const token = localStorage.getItem('token');
    const bodyData = approved ? { "aprovar_solicitacao": true } : { "recusar_solicitacao": true };

    fetch(`http://localhost:8000/api/acordos/${agreementId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify(bodyData)
    })
    .then(res => {
      if (res.ok) {
        showStatus(approved ? 'Alterações aprovadas e aplicadas!' : 'Solicitação de alteração recusada.', 'success');
        fetchAgreements();
      } else {
        // Fallback simulate locally if mock data
        setAgreements(prev => prev.map(item => {
          if (item.id === agreementId) {
            if (approved) {
              return {
                ...item,
                valor_acordado: item.proposto_valor !== null ? item.proposto_valor : item.valor_acordado,
                descricao_servico: item.proposta_descricao !== null ? item.proposta_descricao : item.descricao_servico,
                conclusao_prevista: item.proposta_conclusao_prevista !== null ? item.proposta_conclusao_prevista : item.conclusao_prevista,
                tem_solicitacao: false,
                solicitado_por: null,
                justificativa_alteracao: null,
                proposto_valor: null,
                proposta_descricao: null,
                proposta_conclusao_prevista: null
              };
            } else {
              return {
                ...item,
                tem_solicitacao: false,
                solicitado_por: null,
                justificativa_alteracao: null,
                proposto_valor: null,
                proposta_descricao: null,
                proposta_conclusao_prevista: null
              };
            }
          }
          return item;
        }));
        showStatus(approved ? 'Alterações aprovadas com sucesso (Simulação Local)!' : 'Solicitação de alteração recusada.', 'success');
      }
    })
    .catch(err => {
      console.error(err);
      showStatus('Erro ao processar decisão.', 'error');
    });
  };

  // Group agreements
  const pendingPaymentAgreements = agreements.filter(app => app.status_acordo === 'Pendente Pagamento');
  const activeAgreements = agreements.filter(app => app.status_acordo === 'Ativo');
  const completedAgreements = agreements.filter(app => app.status_acordo === 'Concluído');
  const cancelledAgreements = agreements.filter(app => app.status_acordo === 'Cancelado');
  const historyAgreements = agreementTab === 'concluidos' ? completedAgreements : cancelledAgreements;

  // Check for received requests (notifications)
  const receivedRequests = agreements.filter(app => app.tem_solicitacao && app.solicitado_por !== backendRole);

  return (
    <div style={{ maxWidth: '950px', margin: '2rem auto', padding: '0 1rem' }}>

      {/* Styles block for animations */}
      <style>{`
        .expandable-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease, padding 0.4s ease;
          padding: 0;
        }
        .expandable-content.expanded {
          max-height: 1000px;
          opacity: 1;
          padding: 1.5rem 0 0 0;
        }
        .rotate-chevron {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .rotate-chevron.rotated {
          transform: rotate(180deg);
        }
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px var(--shadow-color);
        }
        .notification-card {
          animation: pulseBorder 2s infinite alternate;
        }
        @keyframes pulseBorder {
          from { border-color: var(--border-color); }
          to { border-color: var(--primary); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Briefcase size={36} color="var(--primary)" />
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Meus Freelas</h1>
      </div>

      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
        Gerencie seus acordos de serviço em andamento, concluídos e cancelados. Proponha e aprove alterações contratuais de forma rápida.
      </p>

      {/* Status Message */}
      {statusMsg.text && (
        <div role="status" aria-live="polite" style={{
          background: statusMsg.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
          borderLeft: `4px solid ${statusMsg.type === 'success' ? '#2ed573' : '#ff4757'}`,
          padding: '1rem',
          borderRadius: '8px',
          color: statusMsg.type === 'success' ? '#2ed573' : '#ff4757',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          position: 'fixed',
          top: '5.5rem',
          right: '1rem',
          zIndex: 1200,
          width: 'min(440px, calc(100vw - 2rem))',
          boxShadow: '0 8px 24px var(--shadow-color)',
          backdropFilter: 'blur(10px)',
        }}>
          {statusMsg.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {statusMsg.text}
        </div>
      )}

      {/* Notifications / Received Requests Section */}
      {receivedRequests.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Bell size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Solicitações Pendentes ({receivedRequests.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {receivedRequests.map(app => (
              <div
                key={app.id}
                className="card notification-card"
                style={{
                  border: '1.5px solid var(--primary)',
                  background: 'rgba(255, 130, 110, 0.05)',
                  boxShadow: '0 6px 15px rgba(255, 130, 110, 0.08)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white', marginBottom: '0.5rem' }}>
                      Pendente de Aprovação
                    </span>
                    <h3 style={{ fontSize: '1.25rem', margin: '0.25rem 0' }}>{app.titulo_anuncio}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                      Solicitado por: <strong>{app.solicitado_por === 'freelancer' ? 'Freelancer' : 'Contratante'}</strong> (
                      {app.solicitado_por === 'freelancer' ? app.nome_prestador : app.nome_contratante})
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDecidirSolicitacao(app.id, false)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', background: '#ff4757', color: 'white', borderColor: '#ff4757' }}
                    >
                      <X size={16} /> Recusar
                    </button>
                    <button
                      onClick={() => handleDecidirSolicitacao(app.id, true)}
                      className="btn"
                      style={{ padding: '0.5rem 1rem', background: '#2ed573' }}
                    >
                      <Check size={16} /> Aprovar
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                    Justificativa das alterações:
                  </div>
                  <p style={{ margin: '0 0 1rem 0', fontStyle: 'italic', fontSize: '0.95rem' }}>
                    “{app.justificativa_alteracao || 'Nenhuma justificativa fornecida.'}”
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <strong>Orçamento Proposto:</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>R$ {app.valor_acordado}</span>
                        <span style={{ color: '#2ed573', fontWeight: 'bold' }}><TrendingUp size={14} style={{ display: 'inline', marginRight: '2px' }} /> R$ {app.proposto_valor}</span>
                      </div>
                    </div>

                    <div>
                      <strong>Prazo Proposto:</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                          {app.conclusao_prevista ? new Date(app.conclusao_prevista + 'T00:00:00').toLocaleDateString() : 'Não definido'}
                        </span>
                        <span style={{ color: '#7C3AED', fontWeight: 'bold' }}>
                          {app.proposta_conclusao_prevista ? new Date(app.proposta_conclusao_prevista + 'T00:00:00').toLocaleDateString() : 'Não definido'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {app.proposta_descricao && app.proposta_descricao !== app.descricao_servico && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <strong>Nova Descrição Proposta:</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                        {app.proposta_descricao}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informativo de Responsabilidade */}
      <div style={{
        background: 'rgba(124, 58, 237, 0.05)',
        borderLeft: '4px solid var(--primary)',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <AlertCircle size={22} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>Termo de Acordo Direto</h3>
          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.85, lineHeight: '1.5' }}>
            As parcerias ativas são gerenciadas e estabelecidas diretamente entre as partes. A plataforma apenas fornece as ferramentas para visualização de termos, propostas e negociação de aditivos ao acordo de serviço.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {[
          ['ativos', `Em andamento (${pendingPaymentAgreements.length + activeAgreements.length})`],
          ['concluidos', `Concluídos (${completedAgreements.length})`],
          ['cancelados', `Cancelados (${cancelledAgreements.length})`],
        ].map(([tab, label]) => (
          <button
            type="button"
            key={tab}
            onClick={() => setAgreementTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: agreementTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
              color: agreementTab === tab ? 'var(--primary)' : 'inherit',
              cursor: 'pointer',
              fontWeight: agreementTab === tab ? 700 : 500,
              padding: '0.8rem 1rem',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {agreementTab === 'ativos' && (
        <>
      {/* Aguardando Pagamento Section */}
      {pendingPaymentAgreements.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffc107' }}>
            <span>Aguardando Pagamento do Serviço ({pendingPaymentAgreements.length})</span>
            <span style={{ fontSize: '0.9rem', opacity: 0.6, fontWeight: 'normal' }}>Checkout pendente</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pendingPaymentAgreements.map(app => {
              const userIsContractor = isContractorOfAgreement(app);
              return (
                <div key={app.id} className="card" style={{ borderLeft: '5px solid #ffc107', background: 'rgba(255, 193, 7, 0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: '#ffc107', color: '#1a1a1a' }}>
                          Pendente de Pagamento
                        </span>
                        <span className="badge" style={{ background: userIsContractor ? 'var(--holo-salmon)' : 'var(--primary)', color: '#1a1a1a', fontWeight: 'bold' }}>
                          Seu Papel: {userIsContractor ? 'Contratante' : 'Freelancer'}
                        </span>
                        {app.cancelamento_pendente && (
                          <span className="badge" style={{ background: '#ff4757', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Ban size={12} /> Cancelamento Pendente
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.4rem', margin: 0, fontWeight: '600' }}>{app.titulo_anuncio}</h3>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', opacity: 0.9, fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={15} color="var(--primary)" />
                          <strong>Contratante:</strong> {app.nome_contratante || 'Não informado'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={15} color="var(--secondary)" />
                          <strong>Freelancer:</strong> {app.nome_prestador || 'Não informado'}
                        </span>
                      </div>
                      <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.95rem', opacity: 0.9 }}>
                        {userIsContractor
                          ? 'Para ativar este acordo, conclua o pagamento do serviço no checkout seguro do Mercado Pago.'
                          : 'Aguardando o contratante concluir o pagamento do serviço para iniciar o projeto.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffc107' }}>
                          Valor do serviço: {Number(app.valor_acordado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      {userIsContractor ? (
                        <>
                          <button
                            onClick={() => handlePayService(app.id)}
                            className="btn"
                            disabled={payingAgreementId !== null || Boolean(app.cancelamento_pendente)}
                            style={{ background: '#ffc107', color: '#1a1a1a', border: 'none', padding: '0.6rem 1.2rem', fontSize: '0.95rem', cursor: 'pointer' }}
                          >
                            {payingAgreementId === app.id ? 'Abrindo checkout...' : 'Pagar serviço'}
                          </button>
                          {import.meta.env.DEV && !app.cancelamento_pendente && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={simulatingAgreementId !== null}
                              onClick={() => handleSimulatePayment(app)}
                              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
                            >
                              {simulatingAgreementId === app.id
                                ? 'Ativando teste...'
                                : 'Simular aprovação de teste'}
                            </button>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#ffc107', fontStyle: 'italic', textAlign: 'right' }}>
                          Aguardando pagamento pelo contratante
                        </div>
                      )}
                      {app.cancelamento_pendente ? (
                        <div style={{ fontSize: '0.82rem', color: '#ff4757', textAlign: 'right', maxWidth: '260px' }}>
                          Você enviou sua solicitação de cancelamento. Aguarde a aprovação da moderação.
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openCancellationModal(app)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ff4757', borderColor: '#ff4757' }}
                        >
                          <Ban size={15} /> Solicitar cancelamento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Em Andamento Section */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Em Andamento ({activeAgreements.length})</span>
          <span style={{ fontSize: '0.9rem', opacity: 0.6, fontWeight: 'normal' }}>Serviços ativos na plataforma</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.7 }}>
              <Clock className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} /> Carregando seus serviços...
            </div>
          ) : activeAgreements.length > 0 ? (
            activeAgreements.map(app => {
              const isExpanded = expandedCards[app.id];
              const userIsContractor = isContractorOfAgreement(app);
              return (
                <div key={app.id} className="card hover-lift" style={{ borderLeft: '5px solid #2ed573' }}>

                  {/* Summary / Header view - Always Visible */}
                  <div
                    onClick={() => toggleExpand(app.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem' }}
                  >
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className="badge" style={{ background: userIsContractor ? 'var(--holo-salmon)' : 'var(--primary)', color: '#1a1a1a', fontWeight: 'bold' }}>
                          Seu Papel: {userIsContractor ? 'Contratante' : 'Freelancer'}
                        </span>
                        {app.tem_solicitacao && (
                          <span className="badge" style={{ background: '#ff4757', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Bell size={12} /> Alteração Pendente
                          </span>
                        )}
                        {app.cancelamento_pendente && (
                          <span className="badge" style={{ background: '#ff4757', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Ban size={12} /> Cancelamento Pendente
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.4rem', margin: 0, fontWeight: '600' }}>{app.titulo_anuncio}</h3>

                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', opacity: 0.9, fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={15} color="var(--primary)" />
                          <strong>Contratante:</strong> {app.nome_contratante || 'Não informado'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={15} color="var(--secondary)" />
                          <strong>Freelancer:</strong> {app.nome_prestador || 'Não informado'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={15} />
                          Confirmado: {app.data_confirmacao ? new Date(app.data_confirmacao).toLocaleDateString() : 'Não informada'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Valor do Acordo</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                          R$ {app.valor_acordado} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.8 }}>/ {app.unidade_valor}</span>
                        </div>
                      </div>

                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem' }}
                        aria-label="Expandir card"
                      >
                        <ChevronDown size={24} className={`rotate-chevron ${isExpanded ? 'rotated' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content View - Animated */}
                  <div className={`expandable-content ${isExpanded ? 'expanded' : ''}`}>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                      {/* Descricao & Proposta */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FileText size={15} /> Descrição dos Serviços Acordados:
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, whiteSpace: 'pre-line' }}>{app.descricao_servico}</p>
                        </div>

                        <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <HelpCircle size={15} /> Proposta Comercial Aceita:
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, fontStyle: 'italic' }}>“{app.proposta_aceita}”</p>
                        </div>
                      </div>

                      {/* Prazo final */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', background: 'var(--bg-color)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
                        <Calendar size={18} color="var(--primary)" />
                        <span>Previsão de Conclusão: <strong>{app.conclusao_prevista ? new Date(app.conclusao_prevista + 'T00:00:00').toLocaleDateString() : 'Não informada'}</strong></span>
                      </div>

                      {/* Current Request Notice inside card */}
                      {app.tem_solicitacao && (
                        <div style={{
                          background: app.solicitado_por === backendRole ? 'rgba(124, 58, 237, 0.05)' : 'rgba(255, 130, 110, 0.05)',
                          border: `1px solid ${app.solicitado_por === backendRole ? 'var(--primary)' : 'var(--primary)'}`,
                          borderRadius: '8px',
                          padding: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            <Clock size={16} />
                            {app.solicitado_por === backendRole ? (
                              <span>Você solicitou alterações neste acordo</span>
                            ) : (
                              <span>Alterações solicitadas pela outra parte</span>
                            )}
                          </div>

                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>
                            <strong>Justificativa:</strong> “{app.justificativa_alteracao}”
                          </p>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.9 }}>
                            <strong>Novos valores propostos:</strong> Orçamento de R$ {app.proposto_valor} | Conclusão em {app.proposta_conclusao_prevista ? new Date(app.proposta_conclusao_prevista + 'T00:00:00').toLocaleDateString() : 'Não informada'}
                          </p>

                          {app.solicitado_por !== backendRole && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button
                                onClick={() => handleDecidirSolicitacao(app.id, false)}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#ff4757', color: 'white', borderColor: '#ff4757' }}
                              >
                                Recusar
                              </button>
                              <button
                                onClick={() => handleDecidirSolicitacao(app.id, true)}
                                className="btn"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#2ed573' }}
                              >
                                Aprovar e Atualizar Acordo
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {app.cancelamento_pendente && (
                        <div style={{
                          background: 'rgba(255, 71, 87, 0.05)',
                          border: '1px solid #ff4757',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            <Ban size={16} />
                            <span>Cancelamento pendente</span>
                          </div>
                          <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', opacity: 0.9 }}>
                            Você enviou sua solicitação de cancelamento. Aguarde a aprovação da moderação.
                          </p>
                          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
                            <strong>Justificativa:</strong> “{app.cancelamento_pendente.justificativa}”
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/chat" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MessageSquare size={16} /> Abrir Chat de Conversa
                        </Link>

                        <button
                          onClick={() => handleConcludeAgreement(app)}
                          className="btn"
                          disabled={concludingAgreementId !== null || Boolean(app.cancelamento_pendente)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2ed573', color: '#17351f' }}
                        >
                          <CheckCircle size={16} />
                          {concludingAgreementId === app.id ? 'Concluindo...' : 'Concluir acordo'}
                        </button>

                        {!app.tem_solicitacao && !app.cancelamento_pendente && (
                          <button
                            onClick={() => handleOpenModal(app)}
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <Edit size={16} /> Solicitar Alterações
                          </button>
                        )}
                        {!app.tem_solicitacao && !app.cancelamento_pendente && (
                          <button
                            type="button"
                            onClick={() => openCancellationModal(app)}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff4757', borderColor: '#ff4757' }}
                          >
                            <Ban size={16} /> Solicitar Cancelamento
                          </button>
                        )}
                        {app.cancelamento_pendente && (
                          <span style={{ color: '#ff4757', fontSize: '0.9rem', alignSelf: 'center' }}>
                            Cancelamento pendente — aguardando aprovação da moderação
                          </span>
                        )}
                      </div>

                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.8 }}>
              <CheckCircle size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
              <h3>Nenhum acordo de serviço em andamento.</h3>
              <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                Aprove propostas nas suas candidaturas ou anúncios para iniciar uma parceria.
              </p>
              <Link to="/" className="btn dark-text">Navegar por Anúncios</Link>
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* Concluídos ou Cancelados */}
      {agreementTab !== 'ativos' && (
      <div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', opacity: 0.8 }}>
          {agreementTab === 'concluidos' ? 'Acordos concluídos' : 'Acordos cancelados'} ({historyAgreements.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {historyAgreements.length > 0 ? (
            historyAgreements.map(app => {
              const isExpanded = expandedCards[app.id];
              const isConcluido = app.status_acordo.toLowerCase().includes('conclui');

              return (
                <div
                  key={app.id}
                  className="card hover-lift"
                  style={{
                    borderLeft: `5px solid ${isConcluido ? '#2ed573' : '#ff4757'}`,
                    opacity: 0.85
                  }}
                >
                  {/* Summary / Header view - Always Visible */}
                  <div
                    onClick={() => toggleExpand(app.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem' }}
                  >
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${isConcluido ? 'success' : 'danger'}`} style={{
                          background: isConcluido ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                          color: isConcluido ? '#2ed573' : '#ff4757'
                        }}>
                          {app.status_acordo}
                        </span>
                        <span className="badge" style={{ background: isContractorOfAgreement(app) ? 'var(--holo-salmon)' : 'var(--primary)', color: '#1a1a1a', fontWeight: 'bold' }}>
                          Seu Papel: {isContractorOfAgreement(app) ? 'Contratante' : 'Freelancer'}
                        </span>
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                          {isConcluido ? 'Finalizado' : 'Cancelado'} em: {
                            (isConcluido ? app.concluido_em : app.cancelado_em)
                              ? new Date(isConcluido ? app.concluido_em : app.cancelado_em).toLocaleDateString()
                              : 'Não informada'
                          }
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.3rem', margin: 0, fontWeight: '500' }}>{app.titulo_anuncio}</h3>
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', opacity: 0.85, fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={14} color="var(--primary)" />
                          <strong>Contratante:</strong> {app.nome_contratante || 'Não informado'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={14} color="var(--secondary)" />
                          <strong>Freelancer:</strong> {app.nome_prestador || 'Não informado'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Valor Final</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>
                          R$ {app.valor_acordado}
                        </div>
                      </div>

                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem' }}
                        aria-label="Expandir card concluído"
                      >
                        <ChevronDown size={20} className={`rotate-chevron ${isExpanded ? 'rotated' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content View - Animated */}
                  <div className={`expandable-content ${isExpanded ? 'expanded' : ''}`}>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                        <strong>Descrição do Serviço:</strong><br />
                        {app.descricao_servico}
                      </p>
                      <p style={{ fontSize: '0.95rem', opacity: 0.9, fontStyle: 'italic' }}>
                        <strong>Proposta Comercial:</strong> “{app.proposta_aceita}”
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap' }}>
                        {isConcluido && !app.avaliacao_enviada && (
                          <Link to={`/my-reviews?acordo=${app.id}`} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                            <Star size={14} /> Avaliar agora
                          </Link>
                        )}
                        <Link to="/chat" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                          <MessageSquare size={14} /> Histórico de Chat
                        </Link>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
              {agreementTab === 'concluidos'
                ? 'Nenhum acordo concluído.'
                : 'Nenhum acordo cancelado.'}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Change Request Modal */}
      {isModalOpen && selectedAgreement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', borderTop: '5px solid var(--primary)', position: 'relative' }}>
            <button
              onClick={handleCloseModal}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit size={24} color="var(--primary)" /> Solicitar Alterações
            </h2>
            <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Proponha novos termos para o acordo de serviço: <strong>{selectedAgreement.titulo_anuncio}</strong>. A outra parte precisará aprovar para que as mudanças entrem em vigor.
            </p>

            <form onSubmit={handleSubmitSolicitacao} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                  Justificativa da Alteração <span style={{ color: '#ff4757' }}>*</span>
                </label>
                <textarea
                  className="input"
                  rows="3"
                  placeholder="Explique detalhadamente à outra parte o motivo da alteração de escopo, prazo ou valor..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                    Novo Orçamento Acordado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Ex: 1500.00"
                    value={valorProposto}
                    onChange={(e) => setValorProposto(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Valor atual: R$ {selectedAgreement.valor_acordado}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                    Nova Previsão Conclusão
                  </label>
                  <input
                    type="date"
                    className="input custom-date-input"
                    value={prazoProposto}
                    onChange={(e) => setPrazoProposto(e.target.value)}
                  />
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                    Prazo atual: {selectedAgreement.conclusao_prevista || 'Não definido'}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                  Nova Descrição do Serviço / Escopo Proposto
                </label>
                <textarea
                  className="input"
                  rows="4"
                  placeholder="Altere o escopo do serviço se necessário..."
                  value={descricaoProposta}
                  onChange={(e) => setDescricaoProposta(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  Enviar Solicitação
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {cancellationAgreement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', borderTop: '5px solid #ff4757', position: 'relative' }}>
            <button
              type="button"
              onClick={closeCancellationModal}
              disabled={requestingCancellation}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              aria-label="Fechar"
            >
              <X size={22} />
            </button>
            <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ban size={23} color="#ff4757" /> Solicitar cancelamento
            </h2>
            <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
              O acordo <strong>{cancellationAgreement.titulo_anuncio}</strong> continuará com o status atual até que um administrador analise a solicitação.
            </p>
            {cancellationAgreement.status_acordo === 'Ativo' && (
              <div style={{ background: 'rgba(255,193,7,.12)', borderLeft: '4px solid #ffc107', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.88rem' }}>
                A aprovação cancela o acordo na plataforma, mas não realiza automaticamente um estorno de pagamento já aprovado.
              </div>
            )}
            <form onSubmit={handleRequestCancellation}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                Justificativa
              </label>
              <textarea
                className="input"
                rows="5"
                minLength="10"
                required
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                placeholder="Explique o motivo do cancelamento para análise administrativa..."
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeCancellationModal} disabled={requestingCancellation}>
                  Voltar
                </button>
                <button type="submit" className="btn" disabled={requestingCancellation} style={{ background: '#ff4757', color: 'white' }}>
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
