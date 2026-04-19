import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

export default function CreateAd() {
  const { role } = useRole();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('servicos_domesticos');
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
      alert("Você precisa estar logado para postar um anúncio.");
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
        alert('Erro ao criar o anúncio.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao criar o anúncio.');
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
                    <option value="tecnologia">Tecnologia</option>
                    <option value="animais">Animais</option>
                    <option value="servicos_domesticos">Serviços Domésticos</option>
                    <option value="educacao">Educação</option>
                    <option value="design">Design e Arte</option>
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
              <input 
                type="text" 
                className="input" 
                placeholder="Adicionar habilidade..."
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill(e);
                  }
                }}
              />
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
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="radio" 
                  name="locationType" 
                  value="remoto" 
                  checked={locationType === 'remoto'}
                  onChange={(e) => setLocationType(e.target.value)} 
                /> Remoto
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="radio" 
                  name="locationType" 
                  value="presencial" 
                  checked={locationType === 'presencial'}
                  onChange={(e) => setLocationType(e.target.value)} 
                /> Presencial
              </label>
            </div>
          </div>

          {locationType === 'presencial' && (
            <div className="form-row">
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
          )}

          {role === 'contractor' ? (
             <div>
               <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Data/Prazo</label>
               <input 
                 type="date" 
                 className="input" 
                 value={deadline}
                 onChange={(e) => setDeadline(e.target.value)}
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
