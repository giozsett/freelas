import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Award, HelpCircle, MessageCircle, CheckCircle, XCircle, Upload, Briefcase, MapPin, Calendar, Mail, Phone } from 'lucide-react';
import ReportModal from '../components/ModalDenuncia';
import IconeRedeSocial from '../components/IconeRedeSocial';
import { calcularTempo } from '../utils/calcularTempo';

const API = 'http://localhost:8000';

export default function PublicProfile() {
  const { id } = useParams();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState('skills');
  const [isLoading, setIsLoading] = useState(true);

  const [user, setUser] = useState({
    id,
    name: 'Carregando...',
    email: '',
    profile: {
      bio: '',
      categories: [],
      skills: [],
      foto_perfil: null,
      banner: null,
      disponivel: true,
      cidade: '',
      telefone: '',
      email_visivel: true,
      telefone_visivel: true,
      redes_sociais: [],
      certificados: [],
      experiencias: [],
      curriculo: null
    },
    roles: [],
    reviews: [],
  });

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API}/api/users/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error('User not found');
        return res.json();
      })
      .then(data => {
        setUser(prev => ({
          ...prev,
          id: data.id,
          name: (`${data.first_name} ${data.last_name}`.trim() || data.username),
          email: data.email || '',
          profile: {
            bio: data.profile?.bio || 'Sem biografia.',
            categories: data.profile?.categories || [],
            skills: data.profile?.skills || [],
            foto_perfil: data.profile?.foto_perfil || null,
            banner: data.profile?.banner || null,
            disponivel: data.profile?.disponivel !== undefined ? data.profile.disponivel : true,
            cidade: data.profile?.cidade || '',
            estado: data.profile?.estado || '',
            telefone: data.profile?.telefone || '',
            redes_sociais: data.profile?.redes_sociais || [],
            email_visivel: data.profile?.email_visivel !== undefined ? data.profile.email_visivel : true,
            telefone_visivel: data.profile?.telefone_visivel !== undefined ? data.profile.telefone_visivel : true,
            certificados: data.profile?.certificados || [],
            experiencias: data.profile?.experiencias || [],
            curriculo: data.profile?.curriculo || null
          },
          roles: [
            {
              type: 'Freelancer',
              rating: data.resumo_avaliacoes?.freelancer?.nota,
              reviews: data.resumo_avaliacoes?.freelancer?.total || 0,
            },
            {
              type: 'Contratante',
              rating: data.resumo_avaliacoes?.contratante?.nota,
              reviews: data.resumo_avaliacoes?.contratante?.total || 0,
            },
          ],
          reviews: Array.isArray(data.avaliacoes_recebidas) ? data.avaliacoes_recebidas : [],
        }));
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setUser(prev => ({ ...prev, name: 'Usuário não encontrado' }));
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando perfil...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '2rem' }}>

        {/* Banner */}
        <div style={{
          width: 'calc(100% + 4rem)',
          margin: '-2rem -2rem 0 -2rem',
          aspectRatio: '4 / 1',
          background: user.profile?.banner ? `url(${user.profile.banner}) center/cover no-repeat` : '#e0e0e0',
          borderRadius: '12px 12px 0 0',
        }} />

        <div className="profile-header" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div style={{
            marginTop: user.profile?.banner ? '-40px' : '0',
            width: '150px', height: '150px', borderRadius: '50%',
            background: user.profile?.foto_perfil ? 'none' : 'var(--holo-gradient-salmon)',
            border: '4px solid var(--surface-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0,
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {user.profile?.foto_perfil ? (
              <img src={user.profile.foto_perfil} alt="Foto" onClick={() => setViewingPhoto(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
            ) : (
              <span style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--primary)', opacity: 0.6, textTransform: 'uppercase' }}>
                {user.name.charAt(0)}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '3rem', margin: 0, textTransform: 'capitalize' }}>{user.name}</h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                background: user.profile?.disponivel ? '#2ecc7120' : '#e74c3c20',
                color: user.profile?.disponivel ? '#2ecc71' : '#e74c3c',
                border: `1px solid ${user.profile?.disponivel ? '#2ecc7130' : '#e74c3c30'}`
              }}>
                {user.profile?.disponivel ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {user.profile?.disponivel ? 'Disponível' : 'Indisponível'}
              </span>
              <button
                onClick={() => setIsReportModalOpen(true)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: '#ff4757', cursor: 'pointer' }}
                title="Denunciar Usuário"
              >
                <HelpCircle size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {user.roles.map(role => (
                <div key={role.type} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={role.type === 'Freelancer' ? "badge salmon" : "badge purple"} style={{ color: 'white' }}>{role.type}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      <Star fill={role.rating ? 'currentColor' : 'transparent'} size={22} color="#f1c40f" /> {role.rating ?? '—'} ({role.reviews})
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '1rem', opacity: 0.85 }}>
              {user.profile?.cidade && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={18} /> {user.profile.cidade}{user.profile?.estado ? ` - ${user.profile.estado}` : ''}
                </span>
              )}
              {user.email && user.profile?.email_visivel && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={18} /> <a href={`mailto:${user.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{user.email}</a>
                </span>
              )}
              {user.profile?.telefone && user.profile?.telefone_visivel && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={18} /> {user.profile.telefone}
                </span>
              )}
              {user.profile?.redes_sociais?.length > 0 && user.profile.redes_sociais.map((rede, idx) => (
                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconeRedeSocial plataforma={rede.plataforma} size={18} />
                  <a href={rede.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-color)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                    {rede.plataforma === 'outro' ? rede.nome : rede.plataforma.charAt(0).toUpperCase() + rede.plataforma.slice(1)}
                  </a>
                </span>
              ))}
              {user.profile?.curriculo && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Upload size={18} />
                  <a href={user.profile.curriculo} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-color)', textDecoration: 'underline' }}>
                    Currículo
                  </a>
                </span>
              )}
            </div>
            {!user.profile?.cidade && !(user.email && user.profile?.email_visivel) && !(user.profile?.telefone && user.profile?.telefone_visivel) && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.95rem', opacity: 0.6 }}>
                Nenhuma informação de contato disponível.
              </div>
            )}
          </div>
        </div>

        {/* Photo Modal */}
        {viewingPhoto && user.profile?.foto_perfil && (
          <div onClick={() => setViewingPhoto(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <img src={user.profile.foto_perfil} alt="Foto" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            <button onClick={() => setViewingPhoto(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.4rem' }}>Sobre Mim</h2>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.8 }}>{user.profile?.bio || 'Sem biografia.'}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.5rem' }}>
          {[
            { key: 'skills', label: 'Habilidades e Especialidades' },
            { key: 'experiencia', label: `Experiência${user.profile?.experiencias?.length > 0 ? ` (${user.profile.experiencias.length})` : ''}` },
            { key: 'certificados', label: `Formação Acadêmica${user.profile?.certificados?.length > 0 ? ` (${user.profile.certificados.length})` : ''}` },
            { key: 'reviews', label: 'Avaliações e Comentários' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none', border: 'none', padding: '1rem 2rem', cursor: 'pointer', fontSize: '1.15rem', fontWeight: 'bold',
                color: activeTab === tab.key ? 'var(--text-color)' : 'gray',
                borderBottom: activeTab === tab.key ? '3px solid var(--holo-salmon)' : '3px solid transparent',
                whiteSpace: 'nowrap'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'skills' && (
          <div>
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Categorias de Atuação</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {user.profile?.categories?.length > 0 ? user.profile.categories.map(cat => (
                  <span key={cat} className="badge" style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-color) !important' }}>{cat}</span>
                )) : <span style={{ opacity: 0.7 }}>Nenhuma categoria listada.</span>}
              </div>
            </div>

            <div>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Habilidades (Freelancer)</h2>
              {user.profile?.skills?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {user.profile.skills.map((skill, idx) => (
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

        {activeTab === 'experiencia' && (
          <div>
            {user.profile?.experiencias?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {user.profile.experiencias.map(exp => (
                  <div key={exp.id} style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-color)'
                  }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '10px',
                      background: 'var(--primary-opacity)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Briefcase size={24} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>{exp.cargo}</div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.85, marginTop: '0.1rem' }}>{exp.empresa}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', opacity: 0.6, marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {exp.local && <><MapPin size={12} /> {exp.local} <span style={{ opacity: 0.3 }}>|</span></>}
                        <Calendar size={12} /> {calcularTempo(exp.data_inicio, exp.data_fim, exp.atual)}
                      </div>
                      {exp.descricao && (
                        <div style={{ fontSize: '0.9rem', opacity: 0.75, marginTop: '0.5rem', lineHeight: 1.5 }}>{exp.descricao}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.7 }}>Nenhuma experiência adicionada ainda.</p>
            )}
          </div>
        )}

        {activeTab === 'certificados' && (
          <div>
            {user.profile?.certificados?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {user.profile.certificados.map(cert => (
                  <div key={cert.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-color)'
                  }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '1rem', marginBottom: '0.15rem' }}>{cert.nome_certificado}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{cert.instituicao}</div>
                    </div>
                    {cert.arquivo_url && (
                      <a
                        href={cert.arquivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          background: 'var(--surface-color)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-color)',
                          textDecoration: 'none',
                          fontSize: '0.85rem'
                        }}
                      >
                        <Upload size={14} /> Ver Arquivo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.7 }}>Nenhum certificado adicionado ainda.</p>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {user.reviews.map((review) => {
              const starsColor = review.role_received === 'freelancer' ? 'var(--holo-salmon)' : 'var(--holo-purple-real)';
              return (
                <div key={review.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{review.reviewer}</h3>
                      <div style={{ fontSize: '0.9rem', color: 'gray', marginTop: '0.2rem' }}>Avaliação como {review.role_received === 'freelancer' ? 'Freelancer' : 'Contratante'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.15rem', flexShrink: 0 }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} fill={i < review.stars ? starsColor : 'transparent'} color={starsColor} />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem', background: 'var(--surface-color)', padding: '0.75rem', borderRadius: '8px' }}>
                    {Object.entries(review.criterios_exibicao || {}).map(([criterion, score]) => (
                      <div key={criterion} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-color)' }}>
                          <span>{criterion}</span>
                          <span style={{ color: 'var(--primary)' }}>{score}/5</span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(score/5)*100}%`, height: '100%', background: 'var(--primary)', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <MessageCircle size={20} style={{ marginTop: '0.1rem', opacity: 0.5, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '1rem', opacity: 0.85, lineHeight: 1.5, wordBreak: 'break-word' }}>“{review.comment}”</p>
                  </div>
                </div>
              )
            })}
            {user.reviews.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
                Este usuário ainda não recebeu avaliações de serviços concluídos.
              </div>
            )}
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
