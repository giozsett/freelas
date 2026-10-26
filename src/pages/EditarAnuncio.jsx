import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';
import { CATEGORIAS_SERVICO } from '../constants/options';
import LocalizacaoAnuncio from '../components/LocalizacaoAnuncio';
import CampoCategoriaHabilidades from '../components/CampoCategoriaHabilidades';

export default function EditAd() {
  const limiteDescricao = 1000;
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  // Categoria salva que saiu do catálogo: obriga a escolher uma nova
  const [categoriaAnterior, setCategoriaAnterior] = useState('');
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
        const categoriaValida = CATEGORIAS_SERVICO.includes(data.category);
        setCategory(categoriaValida ? data.category : '');
        setCategoriaAnterior(categoriaValida ? '' : data.category || '');
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
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setPermissionError('Anúncio não encontrado ou erro ao carregar.');
        setIsLoading(false);
      });
  }, [id, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!category) {
      setSubmitError('Escolha uma categoria da lista.');
      return;
    }
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
      deadline,
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
        setSubmitError(errorData.detail || errorData[0] || 'Erro ao salvar as edições do anúncio.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Erro de conexão ao salvar o anúncio.');
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
        <span className="badge green" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
          Editando vaga
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

          <CampoCategoriaHabilidades
            categoria={category}
            habilidades={skills}
            onChange={({ categoria, habilidades }) => { setCategory(categoria); setSkills(habilidades); }}
            categoriaAnterior={categoriaAnterior}
          />

          <div className="form-row">
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

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Descrição Detalhada</label>
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
