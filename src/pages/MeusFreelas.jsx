import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, User, Calendar, DollarSign, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';

export default function MeusFreelas() {
  const { user } = useAuth();
  const { role } = useRole();
  const [partnerships, setPartnerships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/api/candidaturas/', {
      headers: {
        'Authorization': `Token ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        // Filter approved candidatures based on current role
        const filtered = data.filter(app => {
          if (app.status !== 'aprovada') return false;
          if (role === 'freelancer') {
            return app.user === user.id;
          } else {
            return app.ad_author_id === user.id;
          }
        });
        setPartnerships(filtered);
      }
      setIsLoading(false);
    })
    .catch(err => {
      console.error('Error fetching partnerships:', err);
      setIsLoading(false);
    });
  }, [user, role]);

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Briefcase size={32} color="var(--holo-purple-real)" />
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Meus Freelas</h1>
      </div>

      <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem' }}>
        Visualize aqui os serviços e parcerias ativas que foram confirmadas na plataforma.
      </p>

      {/* Informativo sobre a natureza da parceria (Sem contrato/acordo juridico) */}
      <div style={{
        background: 'rgba(165, 94, 234, 0.1)',
        borderLeft: '4px solid var(--holo-purple-real)',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem'
      }}>
        <AlertCircle size={24} style={{ color: 'var(--holo-purple-real)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>Informações de Parceria Directa</h3>
          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, lineHeight: '1.5' }}>
            Abaixo estão listadas as parcerias confirmadas. O Freelas não gera e não gerencia vínculos contratuais individuais ou obrigações jurídicas. Todos os detalhes combinados e a execução dos serviços são de inteira responsabilidade das partes envolvidas.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando serviços ativas...</div>
        ) : partnerships.length > 0 ? (
          partnerships.map(app => (
            <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <span className="badge purple" style={{ color: 'white', marginBottom: '0.5rem' }}>
                    {role === 'freelancer' ? 'Serviço Prestado' : 'Serviço Contratado'}
                  </span>
                  <Link to={`/ad/${app.anuncio_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2 style={{ fontSize: '1.6rem', margin: 0, textDecoration: 'underline' }}>{app.ad_title}</h2>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                    <Calendar size={16} /> Confirmado em {new Date(app.atualizado_em).toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Orçamento</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <DollarSign size={16} /> {app.ad_price} {app.ad_price_unit && `/ ${app.ad_price_unit}`}
                  </div>
                </div>
              </div>

              {/* Informações dos Participantes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase' }}>Contratante</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} color="var(--holo-blue)" />
                    <span style={{ fontWeight: '500' }}>{app.ad_author_name}</span>
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase' }}>Freelancer / Prestador</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} color="var(--holo-salmon)" />
                    <span style={{ fontWeight: '500' }}>{app.applicant_name}</span>
                  </div>
                </div>
              </div>

              {/* Resumo dos Detalhes Combinados */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>Resumo da Parceria</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {app.ad_description && (
                    <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.8, marginBottom: '0.5rem' }}>Descrição do Serviço:</div>
                      <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{app.ad_description}</p>
                    </div>
                  )}

                  <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.8, marginBottom: '0.5rem' }}>Apresentação / Proposta Aceita:</div>
                    <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.9, fontSize: '0.95rem' }}>"{app.mensagem}"</p>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <Link to="/chat" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={16} /> Entrar em Contato via Chat
                </Link>
              </div>

            </div>
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <CheckCircle size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Nenhuma parceria ativa no momento.</h3>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
              {role === 'freelancer' 
                ? 'Candidate-se a vagas e aguarde a aprovação do contratante.' 
                : 'Publique anúncios e aprove propostas para iniciar uma parceria.'}
            </p>
            <Link to="/" className="btn dark-text">Ir para Página Inicial</Link>
          </div>
        )}
      </div>
    </div>
  );
}
