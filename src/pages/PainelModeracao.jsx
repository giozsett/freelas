import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User, FileText, CheckCircle, XCircle, X } from 'lucide-react';

export default function ModerationPanel() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [alteracoes, setAlteracoes] = useState([]);
  const [activeTab, setActiveTab] = useState('denuncias');
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    // Check if moderator is logged in
    if (!localStorage.getItem('isModerator')) {
      navigate('/moderator-login');
      return;
    }

    // Fetch reports
    fetch('http://localhost:8000/api/reports/')
      .then(res => {
        if (!res.ok) throw new Error('API indisponível');
        return res.json();
      })
      .then(data => {
         if (data.length > 0) {
            setReports(data);
         } else {
             // Fallback to mock data to ensure UI displays clearly before seeding
             setReports([
                { id: 1, type: 'user', target_id: '2', target_name: 'Roberto Oliveira', category: 'spam', comment: 'Enviando mensagens irrelevantes no chat repetidamente.', status: 'pending', created_at: '2026-04-14T10:30:00Z' },
                { id: 2, type: 'ad', target_id: '15', target_name: 'Passeador de Cães Estressado', category: 'fraude', comment: 'Pede pagamento adiantado e não aparece.', status: 'pending', created_at: '2026-04-14T11:45:00Z' },
                { id: 3, type: 'user', target_id: '8', target_name: 'Usuário Falso', category: 'ofensivo', comment: 'Postou comentários rudes no meu perfil.', status: 'procedente', created_at: '2026-04-13T09:12:00Z' },
             ]);
         }
      })
      .catch((err) => {
          console.error(err);
          // Use mock data if API is down
          setReports([
            { id: 1, type: 'user', target_id: '2', target_name: 'Roberto Oliveira', category: 'spam', comment: 'Enviando mensagens irrelevantes no chat repetidamente.', status: 'pending', created_at: '2026-04-14T10:30:00Z' },
            { id: 2, type: 'ad', target_id: '15', target_name: 'Passeador de Cães Estressado', category: 'fraude', comment: 'Pede pagamento adiantado e não aparece.', status: 'pending', created_at: '2026-04-14T11:45:00Z' },
          ]);
      });

    // Fetch agreement change requests (tem_solicitacao=true)
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/acordos/?tem_solicitacao=true', {
      headers: token ? { 'Authorization': `Token ${token}` } : {}
    })
      .then(res => {
        if (!res.ok) throw new Error('API de acordos indisponível');
        return res.json();
      })
      .then(data => {
         if (Array.isArray(data)) {
            setAlteracoes(data);
         }
      })
      .catch((err) => {
          console.error('Error fetching alteracoes, using mock fallback:', err);
          setAlteracoes([
            {
              id: 1,
              titulo_anuncio: "Desenvolvimento de Landing Page responsiva",
              nome_contratante: "Clínica Pet Feliz",
              nome_prestador: "Gabriel Silva",
              valor_acordado: 1200.0,
              descricao_servico: "Criação de landing page responsiva em HTML/CSS/JS.",
              status_acordo: "Ativo",
              tem_solicitacao: true,
              solicitado_por: "freelancer",
              justificativa_alteracao: "O cliente pediu a inclusão de seções adicionais no formulário de contato e galeria de imagens.",
              proposto_valor: 1600.0,
              proposta_descricao: "Criação de landing page responsiva + formulário completo e galeria.",
              proposta_conclusao_prevista: "2026-07-08",
              data_confirmacao: "2026-06-15T10:00:00Z"
            },
            {
              id: 4,
              titulo_anuncio: "Criação de Identidade Visual",
              nome_contratante: "Julia Souza",
              nome_prestador: "Renato Dias",
              valor_acordado: 500.0,
              descricao_servico: "Design de logotipo, paleta de cores e tipografia.",
              status_acordo: "Ativo",
              tem_solicitacao: true,
              solicitado_por: "contratante",
              justificativa_alteracao: "Gostaria de estender o prazo em uma semana para revisar melhor os conceitos.",
              proposto_valor: 500.0,
              proposta_descricao: "Design de logotipo, paleta de cores e tipografia com mais revisões.",
              proposta_conclusao_prevista: "2026-07-20",
              data_confirmacao: "2026-06-18T11:00:00Z"
            }
          ]);
      });
  }, [navigate]);

  const handleResolve = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/reports/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
      } else {
        console.error('Erro ao resolver denúncia no backend.');
        setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
      }
    } catch (err) {
      console.error(err);
      setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
    setSelectedReport(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('isModerator');
    navigate('/moderator-login');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShieldAlert size={36} color="var(--holo-purple-real)" />
            <h1 style={{ margin: 0 }}>Painel de Moderação</h1>
         </div>
         <button onClick={handleLogout} className="btn btn-secondary">Sair</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('denuncias')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'denuncias' ? 'var(--holo-purple-real)' : 'inherit', 
            fontWeight: activeTab === 'denuncias' ? 'bold' : 'normal',
            borderBottom: activeTab === 'denuncias' ? '2px solid var(--holo-purple-real)' : 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          Denúncias
        </button>
        <button 
          onClick={() => setActiveTab('alteracoes')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'alteracoes' ? 'var(--holo-purple-real)' : 'inherit', 
            fontWeight: activeTab === 'alteracoes' ? 'bold' : 'normal',
            borderBottom: activeTab === 'alteracoes' ? '2px solid var(--holo-purple-real)' : 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          Solicitações de Alteração
        </button>
        <button 
          onClick={() => setActiveTab('admin')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: activeTab === 'admin' ? 'var(--holo-purple-real)' : 'inherit', 
            fontWeight: activeTab === 'admin' ? 'bold' : 'normal',
            borderBottom: activeTab === 'admin' ? '2px solid var(--holo-purple-real)' : 'none',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          Mais opções de admin
        </button>
      </div>

      {activeTab === 'denuncias' && (
        <div className="card">
           <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Denúncias Recentes</h2>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reports.length === 0 ? (
                 <p>Nenhuma denúncia no momento.</p>
              ) : (
                 reports.map(report => (
                    <div key={report.id} style={{ 
                        padding: '1.25rem', 
                        background: 'var(--bg-color)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1.5rem',
                        alignItems: 'flex-start',
                        opacity: report.status !== 'pending' ? 0.7 : 1
                    }}>
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '80px' }}>
                            {report.type === 'user' ? <User size={32} color="var(--holo-salmon)" /> : <FileText size={32} color="var(--holo-purple-real)" />}
                            <span className="badge" style={{ background: 'var(--surface-color)' }}>
                                {report.type === 'user' ? 'Usuário' : 'Anúncio'}
                            </span>
                        </div>
                        
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{report.target_name}</h3>
                                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                   {new Date(report.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#ff4757', textTransform: 'capitalize' }}>
                               Motivo: {report.category}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                               "{report.comment}"
                            </p>
                        </div>
                        
                        <div style={{ alignSelf: 'center' }}>
                           {report.status !== 'pending' ? (
                               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: report.status === 'procedente' ? '#1dd1a1' : '#ff4757', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                   {report.status === 'procedente' ? <CheckCircle size={20} /> : <XCircle size={20} />} {report.status}
                               </span>
                           ) : (
                               <button onClick={() => setSelectedReport(report)} className="btn dark-text" style={{ padding: '0.5rem 1rem' }}>
                                   Avaliar Denúncia
                               </button>
                           )}
                        </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      )}

      {activeTab === 'alteracoes' && (
        <div className="card">
           <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Solicitações de Alteração de Acordo</h2>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {alteracoes.length === 0 ? (
                 <p>Nenhuma solicitação de alteração pendente no momento.</p>
              ) : (
                 alteracoes.map(alt => (
                    <div key={alt.id} style={{ 
                        padding: '1.25rem', 
                        background: 'var(--bg-color)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                                <span className="badge" style={{ background: 'var(--primary)', color: 'white', marginRight: '0.5rem' }}>
                                    Acordo Ativo
                                </span>
                                <span className="badge" style={{ background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757' }}>
                                    Solicitado por {alt.solicitado_por === 'freelancer' ? 'Freelancer' : 'Contratante'}
                                </span>
                                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem' }}>{alt.titulo_anuncio}</h3>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.9rem', opacity: 0.8 }}>
                                <strong>Contratante:</strong> {alt.nome_contratante}<br />
                                <strong>Prestador:</strong> {alt.nome_prestador}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                            <p style={{ margin: 0 }}>
                                <strong>Justificativa do pedido:</strong> <span style={{ fontStyle: 'italic' }}>"{alt.justificativa_alteracao}"</span>
                            </p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem', background: 'var(--surface-color)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <strong>Orçamento:</strong><br />
                                    <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: '0.5rem' }}>R$ {alt.valor_acordado}</span>
                                    <span style={{ color: '#2ed573', fontWeight: 'bold' }}>→ R$ {alt.proposto_valor}</span>
                                </div>
                                <div>
                                    <strong>Prazo Conclusão:</strong><br />
                                    <span style={{ textDecoration: 'line-through', opacity: 0.6, marginRight: '0.5rem' }}>
                                      {alt.conclusao_prevista ? new Date(alt.conclusao_prevista + 'T00:00:00').toLocaleDateString() : 'Não definido'}
                                    </span>
                                    <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>
                                      → {alt.proposta_conclusao_prevista ? new Date(alt.proposta_conclusao_prevista + 'T00:00:00').toLocaleDateString() : 'Não definido'}
                                    </span>
                                </div>
                            </div>
                            
                            {alt.proposta_descricao && alt.proposta_descricao !== alt.descricao_servico && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong>Nova Descrição Proposta:</strong>
                                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>{alt.proposta_descricao}</p>
                                </div>
                            )}
                        </div>
                    </div>
                 ))
              )}
           </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', textAlign: 'center' }}>
           <h2 style={{ marginBottom: '1rem' }}>Painel de Administração do Django</h2>
           <p style={{ marginBottom: '2rem', maxWidth: '600px', opacity: 0.8 }}>
              Acesse o painel completo do Django para gerenciar usuários, perfis, anúncios e ter controle total sobre o banco de dados do sistema.
           </p>
           <a href="http://localhost:8000/admin" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              Ir para o Painel do Django
           </a>
        </div>
      )}

      {selectedReport && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedReport(null);
          }}
        >
          <div className="card" style={{ maxWidth: '600px', width: '100%', position: 'relative' }}>
            <button 
              onClick={() => setSelectedReport(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={24} />
            </button>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert color="var(--holo-purple-real)" /> Avaliar Denúncia
            </h2>
            
            <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <p><strong>Alvo:</strong> {selectedReport.target_name} ({selectedReport.type === 'user' ? 'Usuário' : 'Anúncio'})</p>
              <p><strong>Motivo:</strong> <span style={{ textTransform: 'capitalize', color: '#ff4757', fontWeight: 'bold' }}>{selectedReport.category}</span></p>
              <p><strong>Data:</strong> {new Date(selectedReport.created_at).toLocaleString()}</p>
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-color)', borderLeft: '4px solid #ff4757', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontStyle: 'italic' }}>"{selectedReport.comment}"</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedReport(null)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={() => handleResolve(selectedReport.id, 'improcedente')} className="btn" style={{ background: 'var(--holo-salmon)', color: 'white' }}>
                Improcedente
              </button>
              <button onClick={() => handleResolve(selectedReport.id, 'procedente')} className="btn" style={{ background: 'var(--holo-purple-real)', color: 'black', fontWeight: 'bold' }}>
                Procedente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
