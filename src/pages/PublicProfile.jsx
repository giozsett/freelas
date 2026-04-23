import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Award, HelpCircle, MessageCircle } from 'lucide-react';
import ReportModal from '../components/ReportModal';

export default function PublicProfile() {
  const { id } = useParams();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('skills');
  const [isLoading, setIsLoading] = useState(true);
  
  const [user, setUser] = useState({
    id,
    name: 'Carregando...',
    bio: '',
    categories: [],
    skills: [],
    roles: [
      { type: 'Freelancer', rating: 4.9, reviews: 31 },
      { type: 'Contratante', rating: 5.0, reviews: 12 }
    ]
  });

  useEffect(() => {
    setIsLoading(true);
    fetch(`http://localhost:8000/api/users/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error('User not found');
        return res.json();
      })
      .then(data => {
        setUser(prev => ({
          ...prev,
          name: data.first_name || data.username,
          bio: data.profile?.bio || 'Sem biografia.',
          categories: data.profile?.categories || [],
          skills: data.profile?.skills || []
        }));
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setUser(prev => ({ ...prev, name: 'Usuário não encontrado' }));
        setIsLoading(false);
      });
  }, [id]);

  const dummyReviews = [
    {
      id: 1,
      role_received: 'freelancer',
      reviewer: 'Ana Costa',
      comment: 'Trabalho super rápido e a comunicação foi excelente!',
      criteria: { 'Comunicação': 5, 'Qualidade': 5, 'Prazo': 4 },
      stars: 5
    },
    {
      id: 2,
      role_received: 'contractor',
      reviewer: 'Carlos Dev',
      comment: 'Ótimo cliente. Pagou no prazo e foi muito claro nas instruções do projeto.',
      criteria: { 'Clareza': 5, 'Pagamento': 5, 'Suporte': 4 },
      stars: 4
    }
  ];

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando perfil...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        
        <div className="profile-header">
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--holo-gradient-salmon)', border: 'var(--border-width) solid var(--border-color)', boxShadow: '2px 2px 8px var(--shadow-color)', flexShrink: 0 }}></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.2rem' }}>
               <h1 style={{ fontSize: '2.5rem', margin: 0, textTransform: 'capitalize' }}>{user.name}</h1>
               <button 
                 onClick={() => setIsReportModalOpen(true)}
                 style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                 title="Denunciar Usuário"
               >
                 <HelpCircle size={28} color="#ff4757" />
               </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {user.roles.map(role => (
                <div key={role.type} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={role.type === 'Freelancer' ? "badge salmon" : "badge purple"} style={{ color: 'white' }}>{role.type}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                    <Star fill="currentColor" size={18} color="#f1c40f" /> {role.rating} ({role.reviews})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Sobre Mim</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.8 }}>{user.bio}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('skills')}
            style={{
              background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold',
              color: activeTab === 'skills' ? 'var(--text-color)' : 'gray',
              borderBottom: activeTab === 'skills' ? '3px solid var(--holo-salmon)' : '3px solid transparent'
            }}>
            Habilidades e Especialidades
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 'bold',
              color: activeTab === 'reviews' ? 'var(--text-color)' : 'gray',
              borderBottom: activeTab === 'reviews' ? '3px solid var(--holo-salmon)' : '3px solid transparent'
            }}>
            Avaliações e Comentários
          </button>
        </div>

        {activeTab === 'skills' && (
          <div>
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Categorias de Atuação</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {user.categories.length > 0 ? user.categories.map(cat => (
                  <span key={cat} className="badge" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>{cat}</span>
                )) : <span style={{ opacity: 0.7 }}>Nenhuma categoria listada.</span>}
              </div>
            </div>

            <div>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Habilidades (Freelancer)</h2>
              {user.skills.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {user.skills.map((skill, idx) => (
                    <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)' }}>
                      <span style={{ fontWeight: '500' }}>{skill.name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>
                        <Award size={16} /> {skill.level}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                 <p style={{ opacity: 0.8 }}>Não há habilidades listadas.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {dummyReviews.map((review) => {
              const starsColor = review.role_received === 'freelancer' ? 'var(--holo-salmon)' : 'var(--holo-purple-real)';
              return (
                <div key={review.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{review.reviewer}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'gray', marginTop: '0.2rem' }}>Av. recebida como {review.role_received === 'freelancer' ? 'Freelancer' : 'Contratante'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} fill={i < review.stars ? starsColor : 'transparent'} color={starsColor} />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', background: 'var(--surface-color)', padding: '0.8rem', borderRadius: '8px' }}>
                    {Object.entries(review.criteria).map(([criterion, score]) => (
                      <div key={criterion} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'gray', textTransform: 'uppercase' }}>{criterion}</span>
                        <span style={{ fontWeight: 'bold' }}>{score}/5</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <MessageCircle size={18} style={{ marginTop: '0.1rem', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.9 }}>"{review.comment}"</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        targetId={user.id} 
        targetName={user.name} 
        type="user" 
      />
    </div>
  );
}
