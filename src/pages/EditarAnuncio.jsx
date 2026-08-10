import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';
import { CATEGORIAS_SERVICO, HABILIDADES_POR_CATEGORIA } from '../constants/options';
import DisponibilidadeSemanal, { disponibilidadeVazia, normalizarDisponibilidade } from '../components/DisponibilidadeSemanal';
import LocalizacaoAnuncio from '../components/LocalizacaoAnuncio';

export default function EditAd() {
  const limiteDescricao = 1000;
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIAS_SERVICO[0]);
  const [skills, setSkills] = useState([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [skillError, setSkillError] = useState('');
  const habilidadesDisponiveis = HABILIDADES_POR_CATEGORIA[category] || [];
  
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('/h');
  
  const [description, setDescription] = useState('');
  
  const [locationType, setLocationType] = useState('remoto');
  const [localizacao, setLocalizacao] = useState({
    estado: '', cidade: '', bairro: '', address: '', addressNumber: '',
  });
  
  const [deadline, setDeadline] = useState('');
  const [availability, setAvailability] = useState(disponibilidadeVazia);
  
  const [adRole, setAdRole] = useState('freelancer');
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch(`http://localhost:8000/api/ads/${id}/`)
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar anúncio');
        return res.json();
      })
      .then(data => {
        // Enforce that only the author can edit
        if (user && data.author !== user.id) {
          setPermissionError('Você não tem permissão para editar este anúncio.');
          setIsLoading(false);
          return;
        }

        setTitle(data.title || data.titulo || '');
        setCategory(data.category || CATEGORIAS_SERVICO[0]);
        setSkills(data.skills || []);
        setPrice(data.price || (data.valor ? String(data.valor) : ''));
        setPriceUnit(data.price_unit || '/h');
        setLocationType(data.location_type || 'remoto');
        setLocalizacao({
          estado: data.estado || '',
          cidade: data.cidade || '',
          bairro: data.bairro || '',
          address: data.address || '',
          addressNumber: data.address_number || '',
        });
        setDescription(data.description || data.descricao || '');
        setDeadline(data.deadline || '');
        setAvailability(normalizarDisponibilidade(data.availability));
        setAdRole(data.role || 'freelancer');
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPermissionError('Anúncio não encontrado ou erro ao carregar.');
        setIsLoading(false);
      });
  }, [id, user, navigate]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!currentSkill.trim()) return;
    
    if (skills.length >= 5) {
      setSkillError('Só é possível adicionar 5 habilidades por anúncio.');
      return;
    }
    
    if (skills.includes(currentSkill)) {
      setSkillError('Esta habilidade já foi adicionada.');
      return;
    }
    
    setSkills([...skills, currentSkill.trim()]);
    setCurrentSkill('');
    setSkillError('');
  };

  const handleRemoveSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
    if (skillError) setSkillError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log("Você precisa estar logado para editar o anúncio.");
      return;
    }

    const payload = {
      title,
      category,
      price,
      price_unit: priceUnit,
      skills,
      location_type: locationType,
      address: locationType === 'presencial' ? localizacao.address : '',
      address_number: locationType === 'presencial' ? localizacao.addressNumber : '',
      estado: locationType === 'presencial' ? localizacao.estado : '',
      cidade: locationType === 'presencial' ? localizacao.cidade : '',
      bairro: locationType === 'presencial' ? localizacao.bairro : '',
      description,
      role: adRole,
      deadline: adRole === 'contractor' ? deadline : '',
      availability: adRole === 'freelancer' ? availability : ''
    };

    try {
      const response = await fetch(`http://localhost:8000/api/ads/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate(`/ad/${id}`);
      } else {
        const errorData = await response.json();
        console.error(errorData);
        console.error('Erro ao salvar as edições do anúncio.');
      }
    } catch (err) {
      console.error(err);
      console.error('Erro de conexão ao salvar o anúncio.');
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando dados do anúncio...</div>;
  }

  if (permissionError) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }} className="card">
        <h2 style={{ color: 'var(--holo-salmon)', marginBottom: '1rem' }}>Acesso Negado</h2>
        <p>{permissionError}</p>
        <button className="btn" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/my-ads')}>Voltar para Meus Anúncios</button>
      </div>
    );
  }

  return (
    <div className="ad-form-page">
      <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Editar Anúncio</h1>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className={adRole === 'freelancer' ? 'badge purple' : 'badge green'} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
          {adRole === 'freelancer' ? 'Editando anúncio como freelancer' : 'Editando anúncio como contratante'}
        </span>
      </div>
      <div className="card ad-form-card">
        <form className="ad-form" onSubmit={handleSubmit}>
          
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Título do Anúncio</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ex: Desenvolvedor Front-end React, Faxineira Diarista..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
             <div style={{ flex: 1 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Categoria</label>
                <select className="input" value={category} onChange={(e) => {
                  setCategory(e.target.value);
                  setCurrentSkill('');
                }}>
                  {CATEGORIAS_SERVICO.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
             </div>
             <div style={{ flex: 1 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Valor (R$)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ex: 50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    style={{ flex: 2 }}
                  />
                  <select 
                    className="input" 
                    value={priceUnit} 
                    onChange={(e) => setPriceUnit(e.target.value)}
                    style={{ flex: 1, padding: '0 0.5rem' }}
                  >
                    <option value="/h">/h</option>
                    <option value="/dia">/dia</option>
                    <option value="total">total</option>
                  </select>
                </div>
             </div>
          </div>

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Habilidades (máximo 5)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select 
                className="input" 
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
              >
                <option value="">Selecione uma habilidade...</option>
                {habilidadesDisponiveis.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
              <button 
                type="button" 
                className="btn dark-text" 
                onClick={handleAddSkill}
                disabled={skills.length >= 5}
              >
                Adicionar
              </button>
            </div>
            {skillError && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{skillError}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {skills.map((skill, index) => (
                <span key={index} className="badge purple" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {skill}
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSkill(index)}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Tipo de Trabalho</label>
            <div className="work-mode-toggle">
              <div 
                onClick={() => setLocationType('remoto')}
                className={`work-mode-option${locationType === 'remoto' ? ' selected' : ''}`}
              >
                Remoto
              </div>
              <div 
                onClick={() => setLocationType('presencial')}
                className={`work-mode-option${locationType === 'presencial' ? ' selected' : ''}`}
              >
                Presencial
              </div>
            </div>
          </div>

          {locationType === 'presencial' && (
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>{locationType === 'presencial' ? 'Local do trabalho' : 'Sua área de atendimento'}</h3>
              <p className="form-help">Cidade obrigatória para o anúncio. Endereço, bairro e localização exata são opcionais.</p>
              <LocalizacaoAnuncio value={localizacao} onChange={setLocalizacao} cidadeObrigatoria />
            </div>
          )}

          {adRole === 'contractor' ? (
             <div>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Data/Prazo</label>
                <input 
                  type="date" 
                  className="input custom-date-input" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ cursor: 'pointer' }}
                  required
                />
             </div>
          ) : (
             <DisponibilidadeSemanal value={availability} onChange={setAvailability} />
          )}

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Descrição Detalhada</label>
            <textarea 
              className="input" 
              rows="6"
              placeholder="Descreva o que você oferece ou o que você precisa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={limiteDescricao}
              style={{ resize: 'none' }}
              required
            ></textarea>
            <small className="character-counter">{limiteDescricao - description.length} caracteres restantes</small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '1rem', fontSize: '1.2rem' }} onClick={() => navigate(`/ad/${id}`)}>
              Cancelar
            </button>
            <button type="submit" className="btn dark-text" style={{ flex: 1, padding: '1rem', fontSize: '1.2rem' }}>
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
