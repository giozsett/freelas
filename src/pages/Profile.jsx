import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Edit3, Award, Zap, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user: authUser, token } = useAuth();
  const [profile, setProfile] = useState({
    bio: '',
    categories: [],
    skills: []
  });
  const [activeTab, setActiveTab] = useState('skills');

  useEffect(() => {
    if (token) {
      fetch('http://localhost:8000/api/auth/profile/', {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          setProfile({
            bio: data.bio || '',
            categories: data.categories || [],
            skills: data.skills || []
          });
        })
        .catch(err => console.error(err));
    }
  }, [token]);

  const userContext = {
    name: authUser ? (authUser.first_name || authUser.username) : 'Usuário',
    plan: 'Gratuito',
    rating: 4.8,
    reviews: 4
  };

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
      role_received: 'freelancer',
      reviewer: 'Empresa XPTO',
      comment: 'Muito satisfeito com a entrega do projeto.',
      criteria: { 'Comunicação': 4, 'Qualidade': 5, 'Prazo': 5 },
      stars: 5
    },
    {
      id: 3,
      role_received: 'contractor',
      reviewer: 'Carlos Dev',
      comment: 'Ótimo cliente. Pagou no prazo e foi muito claro nas instruções do projeto.',
      criteria: { 'Clareza': 5, 'Pagamento': 5, 'Suporte': 4 },
      stars: 4
    },
    {
      id: 4,
      role_received: 'contractor',
      reviewer: 'Mariana UI',
      comment: 'O projeto teve alguns atrasos de documentação da parte deles, mas foi um bom trabalho.',
      criteria: { 'Clareza': 3, 'Pagamento': 5, 'Suporte': 4 },
      stars: 4
    }
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ position: 'relative' }}>
        <Link to="/profile/edit" className="btn dark-text" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Edit3 size={18} /> Editar
        </Link>

        <div className="profile-header">
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--holo-gradient)', border: 'var(--border-width) solid var(--border-color)', boxShadow: '2px 2px 8px var(--shadow-color)', flexShrink: 0 }}></div>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.2rem', textTransform: 'capitalize' }}>{userContext.name}</h1>

            {/* Plan Info */}
            <div style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Zap size={18} color="var(--holo-blue)" /> Plano {userContext.plan} - <Link to="/plans" style={{ color: 'var(--text-color)', fontWeight: 'bold' }}>Fazer Upgrade</Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.2rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                <Star fill="currentColor" size={20} color="var(--holo-salmon)" /> {userContext.rating} ({userContext.reviews} avaliações)
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Sobre Mim</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.8 }}>{profile.bio || "Adicione uma biografia no botão 'Editar'."}</p>
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
                {profile.categories.length > 0 ? profile.categories.map((cat, i) => (
                  <span key={i} className="badge purple">{cat}</span>
                )) : <span style={{ opacity: 0.7 }}>Nenhuma categoria definida.</span>}
              </div>
            </div>

            <div>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Habilidades e Expertise</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {profile.skills.length > 0 ? profile.skills.map((skill, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>{skill.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>
                      <Award size={16} /> {skill.level}
                    </span>
                  </div>
                )) : <span style={{ opacity: 0.7 }}>Nenhuma habilidade informada.</span>}
              </div>
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
    </div>
  );
}
