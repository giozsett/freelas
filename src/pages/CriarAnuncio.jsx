import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import LocalizacaoAnuncio from '../components/LocalizacaoAnuncio';
import LimitePlano from '../components/LimitePlano';
import CampoCategoriaHabilidades from '../components/CampoCategoriaHabilidades';

export default function CreateAd() {
  const limiteDescricao = 1000;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState([]);

  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('/h');
  
  const [description, setDescription] = useState('');
  
  const [locationType, setLocationType] = useState('remoto');
  const [localizacao, setLocalizacao] = useState({
    estado: '', cidade: '', bairro: '', address: '', addressNumber: '',
  });
  
  const [deadline, setDeadline] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [limiteAtingido, setLimiteAtingido] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:8000/api/ads/limite/', {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.atingiu_limite) setLimiteAtingido(true);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (limiteAtingido) return;
    if (!category) {
      setSubmitError('Escolha uma categoria da lista.');
      return;
    }
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
      address: locationType === 'presencial' ? localizacao.address : '',
      address_number: locationType === 'presencial' ? localizacao.addressNumber : '',
      estado: locationType === 'presencial' ? localizacao.estado : '',
      cidade: locationType === 'presencial' ? localizacao.cidade : '',
      bairro: locationType === 'presencial' ? localizacao.bairro : '',
      description,
      deadline,
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
        setSubmitError(errorData.detail || errorData[0] || 'Erro ao criar o anúncio.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Erro de conexão ao criar o anúncio.');
    }
  };

  return (
    <div className="ad-form-page">
      {limiteAtingido && (
        <div className="mf-modal-backdrop">
          <div className="mf-modal" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <Lock size={40} color="var(--danger-color)" />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Limite de anúncios atingido</h2>
            <p style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: '2rem' }}>
              Você já atingiu seu limite de postagem de anúncios esse mês, atualize seu plano para postar mais anúncios.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, border: '1px solid var(--border-color)', background: 'transparent' }}
                onClick={() => navigate('/')}
              >
                Voltar ao início
              </button>
              <button
                type="button"
                className="btn dark-text"
                style={{ flex: 1 }}
                onClick={() => navigate('/plans')}
              >
                Ver planos
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Postar Novo Anúncio</h1>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <span className="badge green" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
          Nova vaga para freelancers
        </span>
      </div>
      <LimitePlano recurso="anuncios" />
      <div className="card ad-form-card">
        <form className="ad-form" onSubmit={handleSubmit}>
          
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Título do Anúncio <span style={{ color: 'var(--danger-color)' }}>*</span></label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ex: Desenvolvedor Front-end React, Faxineira Diarista..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <CampoCategoriaHabilidades
            categoria={category}
            habilidades={skills}
            onChange={({ categoria, habilidades }) => { setCategory(categoria); setSkills(habilidades); }}
          />

          <div className="form-row">
             <div style={{ flex: 1 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Valor (R$) <span style={{ color: 'var(--danger-color)' }}>*</span></label>
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
            <div className="tab-content-animation">
              <h3 style={{ marginBottom: '0.25rem' }}>{locationType === 'presencial' ? 'Local do trabalho' : 'Sua área de atendimento'}</h3>
              <p className="form-help">Cidade obrigatória para o anúncio. Endereço, bairro e localização exata são opcionais.</p>
              <LocalizacaoAnuncio value={localizacao} onChange={setLocalizacao} cidadeObrigatoria />
            </div>
          )}

             <div>
               <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Data/Prazo <span style={{ color: 'var(--danger-color)' }}>*</span></label>
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

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Descrição Detalhada <span style={{ color: 'var(--danger-color)' }}>*</span></label>
            <textarea 
              className="input" 
              rows="6"
              placeholder="Descreva o serviço que você precisa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={limiteDescricao}
              style={{ resize: 'none' }}
              required
            ></textarea>
            <small className="character-counter">{limiteDescricao - description.length} caracteres restantes</small>
          </div>

          {submitError && (
            <p className="form-error" style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {submitError}
            </p>
          )}

          <button type="submit" className="btn dark-text" style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}>
            Publicar Anúncio
          </button>
        </form>
      </div>
    </div>
  );
}
