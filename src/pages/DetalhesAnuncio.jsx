import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, MapPin, Tag, MessageSquare, Star, Zap, Search, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import ReportModal from '../components/ModalDenuncia';
import { useAuth } from '../context/ContextoAutenticacao';

export default function AdDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
          rating: data.author_rating || 4.5,
          reviews: 10,
          category: data.category,
          skills: data.skills || [],
          locationType: data.location_type,
          address: data.address,
          city: 'Digital', // City could be inferred or stored in future
          price: data.price,
          price_unit: data.price_unit,
          description: data.description,
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

  const handleSendProposal = (e) => {
    e.preventDefault();
    if (!user) {
      console.log("Você precisa estar logado para se candidatar.");
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
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando anúncio...</div>;
  }

  if (!ad) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Anúncio não encontrado.</div>;
  }

  // Determine reputation traits based on ad type
  const reputationLabel = ad.type === 'contractor' 
    ? "Este contratante é conhecido por responder rapidamente e efetuar pagamentos em dia."
    : "Este usuário é muito bem avaliado por entregar os serviços no prazo estabelecido.";

  // Determine reputation color based on score
  const repColor = ad.reputationScore > 80 ? '#1dd1a1' : ad.reputationScore > 50 ? '#feca57' : '#ff6b6b';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className={ad.type === 'freelancer' ? 'badge salmon' : 'badge purple'}>
                {ad.type === 'freelancer' ? 'Anúncio de Freelancer' : 'Anúncio de Contratante'}
              </span>
              <span className="badge" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>
                {ad.locationType === 'remoto' ? 'Vaga Remota' : 'Vaga Presencial'}
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', margin: '0 0 1.5rem 0', lineHeight: '1.2', wordBreak: 'break-word' }}>{ad.title}</h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', opacity: 0.9, marginBottom: '1.5rem' }}>
              <Link 
                to={`/user/${ad.author_id}`} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.4rem', 
                  textDecoration: 'none', color: 'var(--primary)', 
                  fontWeight: '600', padding: '0.3rem 0.8rem', 
                  background: 'var(--secondary)', borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  border: '1px solid transparent'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <User size={18} /> {ad.author}
              </Link>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f39c12', fontWeight: 'bold' }}>
                <Star size={18} fill="currentColor" /> {ad.rating} ({ad.reviews})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: 0.8 }}>
                <MapPin size={18} /> 
                {ad.locationType === 'remoto' 
                  ? 'Remoto' 
                  : (ad.type === 'contractor' ? `${ad.address} - ${ad.city}` : ad.city)
                }
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexShrink: 0 }}>
            <div style={{ background: 'var(--bg-color)', padding: '1rem 1.5rem', borderRadius: '8px', border: 'var(--border-width) solid var(--border-color)', textAlign: 'center', minWidth: '150px' }}>
               <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {ad.type === 'freelancer' ? 'A partir de' : 'Orçamento'}
               </div>
               <div style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.2rem' }}>
                 <span>R$ {ad.price}</span>
                 {ad.price_unit && ad.price_unit !== 'total' && (
                   <span style={{ fontSize: '1.1rem', fontWeight: 'normal', opacity: 0.8 }}>
                     {ad.price_unit}
                   </span>
                 )}
               </div>
            </div>

            <button 
              onClick={() => setIsReportModalOpen(true)}
              style={{ 
                background: 'rgba(255, 71, 87, 0.1)', border: 'none', borderRadius: '8px', 
                cursor: 'pointer', padding: '0.75rem', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', transition: 'all 0.2s ease', height: 'fit-content'
              }}
              title="Denunciar Anúncio"
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 71, 87, 0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 71, 87, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <AlertTriangle size={24} color="#ff4757" />
            </button>
          </div>
        </div>

        {/* Painel do Anunciante (Simulação para usuário que postou o anúncio) */}
        {user && user.id === ad.author_id && (
          <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem', marginTop: '1rem', borderLeft: '4px solid var(--holo-purple-real)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Área do Anunciante</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>Você publicou este anúncio. Acompanhe quem se interessou e gerencie sua publicação.</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <Link to={`/my-ads/manage/${ad.id}`} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Visualizar Candidaturas</Link>
              <Link to={`/edit-ad/${ad.id}`} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', border: '1px solid var(--border-color)' }}>Editar Anúncio</Link>
              <button 
                onClick={() => {
                  setDeleteError('');
                  setIsDeleteModalOpen(true);
                }} 
                className="btn btn-secondary" 
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  borderColor: ad.status_anuncio === 'Finalizado' ? 'var(--border-color)' : '#ff4757', 
                  color: ad.status_anuncio === 'Finalizado' ? '#888' : '#ff4757',
                  background: 'transparent',
                  cursor: ad.status_anuncio === 'Finalizado' ? 'not-allowed' : 'pointer'
                }}
                disabled={ad.status_anuncio === 'Finalizado'}
                title={ad.status_anuncio === 'Finalizado' ? "Anúncios finalizados não podem ser excluídos" : ""}
              >
                Excluir Anúncio
              </button>
            </div>
            {ad.status_anuncio === 'Finalizado' && (
              <p style={{ fontSize: '0.8rem', color: '#ff4757', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
                * Este anúncio já foi finalizado e não pode ser excluído.
              </p>
            )}
          </div>
        )}

        {/* Reputação Bar */}
        <div style={{ background: 'var(--bg-color)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={20} color={repColor} />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Termômetro de Reputação</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: '10px', background: 'linear-gradient(90deg, #ff6b6b 0%, #feca57 50%, #1dd1a1 100%)', borderRadius: '5px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-4px', left: `${ad.reputationScore}%`, transform: 'translateX(-50%)', width: '18px', height: '18px', background: 'var(--surface-color)', border: `3px solid ${repColor}`, borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
              </div>
              <span style={{ fontWeight: 'bold', color: repColor, minWidth: '85px', textAlign: 'right' }}>Excelente</span>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.75rem', lineHeight: '1.4' }}>
            {reputationLabel}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
           <span className="badge" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>
             <Tag size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> {ad.category}
           </span>
           {ad.skills.map(skill => (
             <span key={skill} className="badge" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>{skill}</span>
           ))}
        </div>

        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Descrição</h2>
          <div style={{ whiteSpace: 'pre-line', fontSize: '1.1rem', lineHeight: '1.8', opacity: 0.9 }}>
            {ad.description}
          </div>
        </div>

        {successMessage && (
          <div style={{ padding: '1rem', background: 'var(--accent)', color: '#fff', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
            {successMessage}
          </div>
        )}

        {(!user || user.id !== ad.author_id) && (
          <div style={{ display: 'flex', gap: '1rem', borderTop: 'var(--border-width) solid var(--border-color)', paddingTop: '2rem', flexWrap: 'wrap' }}>
             <button 
               className={hasApplied ? "btn btn-secondary" : "btn"} 
               style={{ flex: 2, padding: '1rem', fontSize: '1.2rem', minWidth: '200px' }}
               onClick={() => !hasApplied && setIsModalOpen(true)}
               disabled={hasApplied}
             >
               <Star size={20} fill="currentColor" /> {hasApplied ? 'Candidatura Pendente' : 'Candidatar-se'}
             </button>
             <Link to="/chat" className="btn btn-secondary" style={{ flex: 1, padding: '1rem', minWidth: '150px' }}>
               <MessageSquare size={20} /> Tirar Dúvidas
             </Link>
          </div>
        )}

      </div>

      {/* Proposal Modal */}
      {isModalOpen && (
        <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', 
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: '1rem' 
        }}>
           <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
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
        <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', 
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: '1rem' 
        }}>
           <div className="card" style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}
              >
                <X size={24} />
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <AlertTriangle size={24} color="#ff4757" />
                  <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#ff4757' }}>Excluir Anúncio</h2>
              </div>
              
              <p style={{ fontSize: '0.95rem', opacity: 0.8, marginBottom: '2rem', lineHeight: '1.5' }}>
                Tem certeza que deseja excluir o anúncio <strong>"{ad.title}"</strong>?
                <br /><br />
                Atenção: Este anúncio continuará contando no limite mensal de anúncios do seu plano de assinatura (<strong>{user?.profile?.subscription_plan || 'Gratuito'}</strong>).
              </p>

              {deleteError && (
                <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {deleteError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                 <button type="button" className="btn btn-secondary" style={{ flex: 1, textTransform: 'uppercase', fontSize: '0.85rem', border: '1px solid var(--border-color)', background: 'transparent' }} onClick={() => setIsDeleteModalOpen(false)}>
                   CANCELAR
                 </button>
                 <button type="button" className="btn" style={{ flex: 1, background: '#ff4757', color: '#FFFFFF', border: 'none', textTransform: 'uppercase', fontSize: '0.85rem' }} onClick={handleDeleteAd}>
                    EXCLUIR ANÚNCIO
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
