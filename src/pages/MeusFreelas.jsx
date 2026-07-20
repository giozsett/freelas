import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  User, 
  Calendar, 
  DollarSign, 
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
  Edit
} from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';

export default function MeusFreelas() {
  const { user } = useAuth();
  const { role } = useRole();
  const isFreelancer = role === 'freelancer';
  const backendRole = isFreelancer ? 'freelancer' : 'contratante';
  const [agreements, setAgreements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});
  
  // Modal State for Change Request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [valorProposto, setValorProposto] = useState('');
  const [prazoProposto, setPrazoProposto] = useState('');
  const [descricaoProposta, setDescricaoProposta] = useState('');
  const [justificativa, setJustificativa] = useState('');
  
  // Status message
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const fetchAgreements = () => {
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
  };

  useEffect(() => {
    fetchAgreements();
  }, [user, role]);

  const toggleExpand = (id) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const showStatus = (text, type) => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg({ text: '', type: '' });
    }, 5000);
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
  const activeAgreements = agreements.filter(app => app.status_acordo === 'Ativo');
  const finishedAgreements = agreements.filter(app => app.status_acordo !== 'Ativo');
  
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
        <div style={{
          background: statusMsg.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
          borderLeft: `4px solid ${statusMsg.type === 'success' ? '#2ed573' : '#ff4757'}`,
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          color: statusMsg.type === 'success' ? '#2ed573' : '#ff4757',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
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
                    "{app.justificativa_alteracao || 'Nenhuma justificativa fornecida.'}"
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
              return (
                <div key={app.id} className="card hover-lift" style={{ borderLeft: '5px solid #2ed573' }}>
                  
                  {/* Summary / Header view - Always Visible */}
                  <div 
                    onClick={() => toggleExpand(app.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem' }}
                  >
                    <div style={{ flex: '1', minWidth: '250px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>
                          {isFreelancer ? 'Prestador' : 'Contratante'}
                        </span>
                        {app.tem_solicitacao && (
                          <span className="badge" style={{ background: '#ff4757', color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Bell size={12} /> Alteração Pendente
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.4rem', margin: 0, fontWeight: '600' }}>{app.titulo_anuncio}</h3>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap', opacity: 0.8, fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={15} color="var(--primary)" /> 
                          {isFreelancer ? `Cliente: ${app.nome_contratante}` : `Freela: ${app.nome_prestador}`}
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
                          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, fontStyle: 'italic' }}>"{app.proposta_aceita}"</p>
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
                            <strong>Justificativa:</strong> "{app.justificativa_alteracao}"
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

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/chat" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MessageSquare size={16} /> Abrir Chat de Conversa
                        </Link>
                        
                        {!app.tem_solicitacao && (
                          <button 
                            onClick={() => handleOpenModal(app)}
                            className="btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                          >
                            <Edit size={16} /> Solicitar Alterações
                          </button>
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

      {/* Concluídos e Cancelados Section */}
      <div>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', opacity: 0.8 }}>
          Concluídos e Cancelados ({finishedAgreements.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {finishedAgreements.length > 0 ? (
            finishedAgreements.map(app => {
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className={`badge ${isConcluido ? 'success' : 'danger'}`} style={{
                          background: isConcluido ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                          color: isConcluido ? '#2ed573' : '#ff4757'
                        }}>
                          {app.status_acordo}
                        </span>
                        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                          Finalizado em: {app.data_confirmacao ? new Date(app.data_confirmacao).toLocaleDateString() : 'Não informada'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.3rem', margin: 0, fontWeight: '500' }}>{app.titulo_anuncio}</h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                        {isFreelancer ? `Cliente: ${app.nome_contratante}` : `Freela: ${app.nome_prestador}`}
                      </p>
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
                        <strong>Proposta Comercial:</strong> "{app.proposta_aceita}"
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
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
              Nenhum serviço finalizado ou cancelado no histórico.
            </div>
          )}
        </div>
      </div>

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

    </div>
  );
}
