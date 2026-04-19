import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Award, HelpCircle } from 'lucide-react';
import ReportModal from '../components/ReportModal';

export default function PublicProfile() {
  const { id } = useParams();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Dummy user pretending they are the author of an ad or chat
  const user = {
    id,
    name: 'Ana Clara',
    bio: 'Sou focada em entregar qualidade e busco sempre suprir as necessidades com atenção. Quando não estou prestando serviços, eventualmente também procuro pessoas de confiança na plataforma.',
    categories: ['Serviços Domésticos', 'Animais'],
    roles: [
      { type: 'Freelancer', rating: 4.9, reviews: 31 },
      { type: 'Contratante', rating: 5.0, reviews: 12 }
    ],
    skills: [
      { name: 'Pet Sitter', level: 'Avançado' },
      { name: 'Passeio', level: 'Especialista' }
    ]
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        
        <div className="profile-header">
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--holo-gradient-salmon)', border: 'var(--border-width) solid var(--border-color)', boxShadow: '2px 2px 8px var(--shadow-color)', flexShrink: 0 }}></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.2rem' }}>
               <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{user.name}</h1>
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

        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Categorias de Atuação</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {user.categories.map(cat => (
              <span key={cat} className="badge" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>{cat}</span>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ marginBottom: '1rem' }}>Habilidades (Freelancer)</h2>
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
