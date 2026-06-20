import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/ContextoPapel';
import { CATEGORIAS_SERVICO, HABILIDADES_PROFISSIONAIS } from '../constants/options';

export default function CreateAd() {
  const { role } = useRole();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIAS_SERVICO[0]);
  const [skills, setSkills] = useState([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [skillError, setSkillError] = useState('');
  
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('/h');
  
  const [description, setDescription] = useState('');
  
  const [locationType, setLocationType] = useState('remoto');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  
  const [deadline, setDeadline] = useState('');
  const [availability, setAvailability] = useState('');

  const navigate = useNavigate();

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
      console.log("Você precisa estar logado para postar um anúncio.");
      return;
    }

    const payload = {
      title,
      category,
      price,
      price_unit: priceUnit,
      skills,
      location_type: locationType,
      address,
      address_number: addressNumber,
      description,
      role,
      deadline,
      availability
    };

    try {
      const response = await fetch('http://localhost:8000/api/ads/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        navigate('/');
      } else {
        const errorData = await response.json();
        console.error(errorData);
        console.error('Erro ao criar o anúncio.');
      }
    } catch (err) {
      console.error(err);
      console.error('Erro de conexão ao criar o anúncio.');
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Postar Novo Anúncio</h1>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className={role === 'freelancer' ? 'badge purple' : 'badge green'} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
          {role === 'freelancer' ? 'Criar anúncio como freelancer' : 'Criar anúncio como contratante'}
        </span>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
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
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
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
                {HABILIDADES_PROFISSIONAIS.map(skill => (
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
            <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: '8px', padding: '0.3rem', border: '1px solid var(--border-color)', gap: '0.3rem' }}>
              <div 
                onClick={() => setLocationType('remoto')}
                style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', background: locationType === 'remoto' ? 'var(--surface-color)' : 'transparent', boxShadow: locationType === 'remoto' ? '0 2px 4px var(--shadow-color)' : 'none', fontWeight: locationType === 'remoto' ? '600' : '400', color: locationType === 'remoto' ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.3s ease' }}
              >
                Remoto
              </div>
              <div 
                onClick={() => setLocationType('presencial')}
                style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: '6px', cursor: 'pointer', background: locationType === 'presencial' ? 'var(--surface-color)' : 'transparent', boxShadow: locationType === 'presencial' ? '0 2px 4px var(--shadow-color)' : 'none', fontWeight: locationType === 'presencial' ? '600' : '400', color: locationType === 'presencial' ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all 0.3s ease' }}
              >
                Presencial
              </div>
            </div>
          </div>

          <div style={{ 
            maxHeight: locationType === 'presencial' ? '200px' : '0', 
            opacity: locationType === 'presencial' ? 1 : 0, 
            overflow: 'hidden', 
            transition: 'all 0.3s ease-in-out',
            marginBottom: locationType === 'presencial' ? '0.5rem' : '0'
          }}>
            <div className="form-row" style={{ paddingTop: '0.5rem' }}>
              <div style={{ flex: 3 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Endereço</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ex: Rua das Flores, Bairro Centro"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required={locationType === 'presencial'}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Número</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Ex: 123"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  required={locationType === 'presencial'}
                />
              </div>
            </div>
          </div>

          {role === 'contractor' ? (
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
             <div>
               <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Disponibilidade</label>
               <textarea 
                 className="input"
                 rows="3"
                 placeholder="Ex: Disponível todos os dias na parte da tarde..."
                 value={availability}
                 onChange={(e) => setAvailability(e.target.value)}
                 style={{ resize: 'none' }}
                 required
               ></textarea>
             </div>
          )}

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Descrição Detalhada</label>
            <textarea 
              className="input" 
              rows="6"
              placeholder="Descreva o que você oferece ou o que você precisa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'none' }}
              required
            ></textarea>
          </div>

          <button type="submit" className="btn dark-text" style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}>
            Publicar Anúncio
          </button>
        </form>
      </div>
    </div>
  );
}
