import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EditProfile() {
  const { token } = useAuth();
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([{ name: '', level: 'iniciante' }]);
  const [categories, setCategories] = useState(['']);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetch('http://localhost:8000/api/auth/profile/', {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setBio(data.bio || '');
        if (data.skills && data.skills.length > 0) setSkills(data.skills);
        if (data.categories && data.categories.length > 0) setCategories(data.categories);
      })
      .catch(err => console.error(err));
    }
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/auth/profile/', {
        method: 'PUT',
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          bio,
          skills: skills.filter(s => s.name.trim() !== ''),
          categories: categories.filter(c => c.trim() !== '')
        })
      });
      if (response.ok) {
        navigate('/profile');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const addSkill = () => {
    if (skills.length < 5) {
      setSkills([...skills, { name: '', level: 'iniciante' }]);
    }
  };

  const updateSkill = (index, field, value) => {
    const newSkills = [...skills];
    newSkills[index][field] = value;
    setSkills(newSkills);
  };

  const removeSkill = (index) => {
    const newSkills = [...skills];
    newSkills.splice(index, 1);
    setSkills(newSkills);
  };

  const addCategory = () => {
    if (categories.length < 5) {
      setCategories([...categories, '']);
    }
  };

  const updateCategory = (index, value) => {
    const newCats = [...categories];
    newCats[index] = value;
    setCategories(newCats);
  };

  const removeCategory = (index) => {
    const newCats = [...categories];
    newCats.splice(index, 1);
    setCategories(newCats);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Editar Perfil</h1>
      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Biografia</label>
            <textarea className="input" rows="5" value={bio} onChange={(e) => setBio(e.target.value)} required></textarea>
          </div>

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Categorias de Serviço (Máximo de 5)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {categories.map((cat, index) => (
                <div key={index} className="form-row" style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="input" placeholder="Ex: Design" style={{ flex: 1 }} value={cat} onChange={(e) => updateCategory(index, e.target.value)} required />
                  {categories.length > 1 && (
                    <button type="button" className="btn" style={{ padding: '0 1rem', background: 'transparent', color: 'var(--text-color)' }} onClick={() => removeCategory(index)}>X</button>
                  )}
                </div>
              ))}
              {categories.length < 5 && (
                <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.9rem' }} onClick={addCategory}>
                  + Adicionar Categoria
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Habilidades e Expertise (Máximo de 5)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {skills.map((skill, index) => (
                <div key={index} className="form-row">
                  <input type="text" className="input" placeholder="Ex: Adestramento Básico" style={{ flex: 2 }} value={skill.name} onChange={(e) => updateSkill(index, 'name', e.target.value)} required />
                  <select className="input" style={{ flex: 1 }} value={skill.level} onChange={(e) => updateSkill(index, 'level', e.target.value)}>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                    <option value="especialista">Especialista</option>
                  </select>
                  {skills.length > 1 && (
                    <button type="button" className="btn" style={{ padding: '0 1rem', background: 'transparent', color: 'var(--text-color)' }} onClick={() => removeSkill(index)}>X</button>
                  )}
                </div>
              ))}
              {skills.length < 5 && (
                <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.9rem' }} onClick={addSkill}>
                  + Adicionar Habilidade
                </button>
              )}
            </div>
          </div>

          <button type="submit" className="btn dark-text" style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem' }}>
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}
