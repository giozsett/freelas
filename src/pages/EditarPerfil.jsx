import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Plus, Trash2, Upload, ToggleLeft, ToggleRight, Briefcase, MapPin, Calendar, Pencil } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { CATEGORIAS_SERVICO, HABILIDADES_PROFISSIONAIS } from '../constants/options';
import { calcularTempo } from '../utils/calcularTempo';
import ModalCrop from '../components/ModalCrop';

const API = 'http://localhost:8000';

export default function EditProfile() {
  const { user: authUser, token, login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([{ name: '', level: 'iniciante' }]);
  const [categories, setCategories] = useState(['']);
  const [disponivel, setDisponivel] = useState(true);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [curriculo, setCurriculo] = useState(null);
  const [curriculoPreview, setCurriculoPreview] = useState(null);
  const [bannerRemovido, setBannerRemovido] = useState(false);
  const [fotoRemovido, setFotoRemovido] = useState(false);

  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [estados, setEstados] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [redesSociais, setRedesSociais] = useState([]);
  const [emailVisivel, setEmailVisivel] = useState(true);
  const [telefoneVisivel, setTelefoneVisivel] = useState(true);

  const [certificados, setCertificados] = useState([]);
  const [novoCertificado, setNovoCertificado] = useState({
    instituicao: '',
    nome_certificado: '',
    arquivo: null,
    exibir_perfil: true
  });
  const [instituicoes, setInstituicoes] = useState([]);
  const [filtroInstituicao, setFiltroInstituicao] = useState('');
  const [showInstituicoesDropdown, setShowInstituicoesDropdown] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [certificadosExistentes, setCertificadosExistentes] = useState([]);

  const [experiencias, setExperiencias] = useState([]);
  const [novaExperiencia, setNovaExperiencia] = useState({
    empresa: '',
    cargo: '',
    local: '',
    data_inicio: '',
    data_fim: '',
    atual: false,
    descricao: ''
  });
  const [showExperienciaForm, setShowExperienciaForm] = useState(false);
  const [editandoCertificado, setEditandoCertificado] = useState(null);
  const [editandoExperiencia, setEditandoExperiencia] = useState(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropAspect, setCropAspect] = useState(1);
  const [cropShape, setCropShape] = useState('round');
  const [cropTarget, setCropTarget] = useState(null);

  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const curriculoInputRef = useRef(null);
  const certificadoFileRef = useRef(null);
  const instituicaoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (authUser) {
      setFirstName(authUser.first_name || '');
      setLastName(authUser.last_name || '');
    }
  }, [authUser]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/auth/profile/`, {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setBio(data.bio || '');
      if (data.skills && data.skills.length > 0) setSkills(data.skills);
      if (data.categories && data.categories.length > 0) setCategories(data.categories);
      if (data.foto_perfil) setFotoPreview(data.foto_perfil);
      if (data.banner) setBannerPreview(data.banner);
      if (data.curriculo) setCurriculoPreview(data.curriculo);
      if (data.disponivel !== undefined) setDisponivel(data.disponivel);
      if (data.cidade) setCidade(data.cidade);
      if (data.estado) setEstado(data.estado);
      if (data.telefone) setTelefone(data.telefone);
      if (data.redes_sociais && Array.isArray(data.redes_sociais)) setRedesSociais(data.redes_sociais);
      if (data.email_visivel !== undefined) setEmailVisivel(data.email_visivel);
      if (data.telefone_visivel !== undefined) setTelefoneVisivel(data.telefone_visivel);
    })
    .catch(err => console.error(err));

    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setEstados(sorted);
      })
      .catch(err => console.error('Erro ao carregar estados:', err));

    fetch(`${API}/api/instituicoes/`)
      .then(res => res.json())
      .then(setInstituicoes)
      .catch(err => console.error(err));

    fetch(`${API}/api/certificados/`, {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCertificadosExistentes(data);
        }
      })
      .catch(err => console.error(err));

    fetch(`${API}/api/experiencias/`, {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setExperiencias(data);
        }
      })
      .catch(err => console.error(err));
  }, [token]);

  useEffect(() => {
    if (!estado) return;
    setCarregandoCidades(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`)
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setCidades(sorted);
        setCarregandoCidades(false);
      })
      .catch(err => {
        console.error('Erro ao carregar cidades:', err);
        setCarregandoCidades(false);
      });
  }, [estado]);

  const instituicoesFiltradas = instituicoes.filter(i =>
    i.nome.toLowerCase().includes(filtroInstituicao.toLowerCase())
  ).slice(0, 10);

  const selecionarInstituicao = (nome) => {
    setNovoCertificado(prev => ({ ...prev, instituicao: nome }));
    setFiltroInstituicao(nome);
    setShowInstituicoesDropdown(false);
  };

  const handleFotoClick = () => {
    fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImage(ev.target.result);
      setCropAspect(1);
      setCropShape('round');
      setCropTarget('foto');
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) return;
    setEnviando(true);

    try {
      if (!firstName.trim() || !lastName.trim()) {
        alert('Preencha o nome e sobrenome.');
        setEnviando(false);
        return;
      }

      const userPatchRes = await fetch(`${API}/api/auth/user/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName })
      });
      if (!userPatchRes.ok) {
        const errText = await userPatchRes.text();
        console.error('Erro ao atualizar nome:', userPatchRes.status, errText);
        throw new Error('Erro ao atualizar nome');
      }

      const formData = new FormData();
      formData.append('bio', bio);
      formData.append('disponivel', disponivel);
      formData.append('skills', JSON.stringify(skills.filter(s => s.name.trim() !== '')));
      formData.append('categories', JSON.stringify(categories.filter(c => c.trim() !== '')));
      formData.append('cidade', cidade);
      formData.append('estado', estado);
      formData.append('telefone', telefone);
      formData.append('redes_sociais', JSON.stringify(redesSociais));
      formData.append('email_visivel', emailVisivel);
      formData.append('telefone_visivel', telefoneVisivel);
      if (banner) {
        formData.append('banner', banner);
      }
      if (curriculo) {
        formData.append('curriculo', curriculo);
      }

      const response = await fetch(`${API}/api/auth/profile/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Erro ao salvar perfil');

      if (bannerRemovido) {
        await fetch(`${API}/api/auth/profile/`, {
          method: 'PATCH',
          headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ banner: null })
        });
      }

      const userRes = await fetch(`${API}/api/auth/user/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        login(userData, token);
      }

      if (fotoPerfil) {
        const fotoData = new FormData();
        fotoData.append('foto_perfil', fotoPerfil);
        await fetch(`${API}/api/auth/profile/foto/`, {
          method: 'PATCH',
          headers: { 'Authorization': `Token ${token}` },
          body: fotoData
        });
      } else if (fotoRemovido) {
        await fetch(`${API}/api/auth/profile/foto/`, {
          method: 'PATCH',
          headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_perfil: null })
        });
      }

      if (novoCertificado.instituicao && novoCertificado.nome_certificado && !editandoCertificado) {
        const certData = new FormData();
        certData.append('instituicao', novoCertificado.instituicao);
        certData.append('nome_certificado', novoCertificado.nome_certificado);
        certData.append('exibir_perfil', novoCertificado.exibir_perfil);
        if (novoCertificado.arquivo) {
          certData.append('arquivo', novoCertificado.arquivo);
        }
        await fetch(`${API}/api/certificados/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}` },
          body: certData
        });
      }

      navigate('/profile');
    } catch(err) {
      console.error(err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const deletarCertificado = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/certificados/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        setCertificadosExistentes(prev => prev.filter(c => c.id !== id));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const adicionarCertificado = async () => {
    if (!token || !novoCertificado.instituicao || !novoCertificado.nome_certificado) return;
    try {
      const certData = new FormData();
      certData.append('instituicao', novoCertificado.instituicao);
      certData.append('nome_certificado', novoCertificado.nome_certificado);
      certData.append('exibir_perfil', novoCertificado.exibir_perfil);
      if (novoCertificado.arquivo) {
        certData.append('arquivo', novoCertificado.arquivo);
      }

      if (editandoCertificado) {
        const res = await fetch(`${API}/api/certificados/${editandoCertificado}/`, {
          method: 'PATCH',
          headers: { 'Authorization': `Token ${token}` },
          body: certData
        });
        if (res.ok) {
          const updated = await res.json();
          setCertificadosExistentes(prev => prev.map(c => c.id === updated.id ? updated : c));
          setEditandoCertificado(null);
        }
      } else {
        const res = await fetch(`${API}/api/certificados/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}` },
          body: certData
        });
        if (res.ok) {
          const data = await res.json();
          setCertificadosExistentes(prev => [data, ...prev]);
        }
      }

      setNovoCertificado({ instituicao: '', nome_certificado: '', arquivo: null, exibir_perfil: true });
      setFiltroInstituicao('');
    } catch(err) {
      console.error(err);
    }
  };

  const adicionarExperiencia = async () => {
    if (!token || !novaExperiencia.empresa || !novaExperiencia.cargo || !novaExperiencia.data_inicio) return;
    try {
      const body = {
        ...novaExperiencia,
        data_fim: novaExperiencia.atual ? null : novaExperiencia.data_fim
      };

      if (editandoExperiencia) {
        const res = await fetch(`${API}/api/experiencias/${editandoExperiencia}/`, {
          method: 'PUT',
          headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const updated = await res.json();
          setExperiencias(prev => prev.map(e => e.id === updated.id ? updated : e));
          setEditandoExperiencia(null);
        }
      } else {
        const res = await fetch(`${API}/api/experiencias/`, {
          method: 'POST',
          headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const data = await res.json();
          setExperiencias(prev => [data, ...prev]);
        }
      }

      setNovaExperiencia({ empresa: '', cargo: '', local: '', data_inicio: '', data_fim: '', atual: false, descricao: '' });
      setShowExperienciaForm(false);
    } catch(err) {
      console.error(err);
    }
  };

  const deletarExperiencia = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/experiencias/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (res.ok) {
        setExperiencias(prev => prev.filter(e => e.id !== id));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const iniciarEdicaoCertificado = (cert) => {
    setEditandoCertificado(cert.id);
    setNovoCertificado({
      instituicao: cert.instituicao,
      nome_certificado: cert.nome_certificado,
      arquivo: null,
      exibir_perfil: cert.exibir_perfil
    });
    setFiltroInstituicao(cert.instituicao);
  };

  const cancelarEdicaoCertificado = () => {
    setEditandoCertificado(null);
    setNovoCertificado({ instituicao: '', nome_certificado: '', arquivo: null, exibir_perfil: true });
    setFiltroInstituicao('');
  };

  const iniciarEdicaoExperiencia = (exp) => {
    setEditandoExperiencia(exp.id);
    setNovaExperiencia({
      empresa: exp.empresa,
      cargo: exp.cargo,
      local: exp.local || '',
      data_inicio: exp.data_inicio,
      data_fim: exp.data_fim || '',
      atual: exp.atual,
      descricao: exp.descricao || ''
    });
    setShowExperienciaForm(true);
  };

  const cancelarEdicaoExperiencia = () => {
    setEditandoExperiencia(null);
    setNovaExperiencia({ empresa: '', cargo: '', local: '', data_inicio: '', data_fim: '', atual: false, descricao: '' });
    setShowExperienciaForm(false);
  };

  const addSkill = () => {
    setSkills([...skills, { name: '', level: 'iniciante' }]);
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
    setCategories([...categories, '']);
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

  const handleCropConfirm = async (blob) => {
    const url = URL.createObjectURL(blob);
    if (cropTarget === 'foto') {
      setFotoPerfil(blob);
      setFotoPreview(url);
      setFotoRemovido(false);
    } else {
      setBanner(blob);
      setBannerPreview(url);
      setBannerRemovido(false);
    }
    setCropModalOpen(false);
    setCropImage(null);
    setCropTarget(null);
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setCropImage(null);
    setCropTarget(null);
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Editar Perfil</h1>
      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Banner */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Banner do Perfil</label>
            <div
              onClick={() => bannerInputRef.current?.click()}
              style={{
                width: '100%',
                aspectRatio: '4 / 1',
                borderRadius: '12px',
                background: bannerPreview ? `url(${bannerPreview}) center/cover no-repeat` : 'var(--bg-color)',
                border: `2px dashed ${bannerPreview ? 'transparent' : 'var(--border-color)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => { if (!bannerPreview) e.currentTarget.style.borderColor = 'var(--primary)'; const overlay = e.currentTarget.querySelector('.banner-overlay'); if (overlay) overlay.style.opacity = '1'; }}
              onMouseLeave={(e) => { if (!bannerPreview) e.currentTarget.style.borderColor = 'var(--border-color)'; const overlay = e.currentTarget.querySelector('.banner-overlay'); if (overlay) overlay.style.opacity = '0'; }}
            >
              {!bannerPreview && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: 0.5 }}>
                  <Camera size={32} color="var(--text-color)" />
                  <span style={{ fontSize: '0.9rem' }}>Clique para adicionar um banner</span>
                </div>
              )}
              {bannerPreview && (
                <div className="banner-overlay" style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}>
                  <Camera size={28} color="white" />
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setCropImage(ev.target.result);
                  setCropAspect(4 / 1);
                  setCropShape('rect');
                  setCropTarget('banner');
                  setCropModalOpen(true);
                };
                reader.readAsDataURL(file);
              }}
            />
            {(banner || bannerPreview) && (
              <button
                type="button"
                onClick={() => { setBanner(null); setBannerPreview(null); setBannerRemovido(true); }}
                style={{ marginTop: '0.25rem', background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Remover banner
              </button>
            )}
          </div>

          {/* Profile Picture */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'var(--bg-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--primary)',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
              onClick={handleFotoClick}
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={60} color="var(--primary)" opacity={0.5} />
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFotoChange}
            />

            <button
              type="button"
              onClick={handleFotoClick}
              style={{
                marginTop: '-20px',
                background: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 4px var(--shadow-color)',
                zIndex: 2,
                transition: 'all 0.2s ease',
                color: 'var(--text-color)'
              }}
              title="Alterar foto de perfil"
            >
              <Camera size={20} />
            </button>

            {(fotoPerfil || fotoPreview) && (
              <button
                type="button"
                onClick={() => { setFotoPerfil(null); setFotoPreview(null); setFotoRemovido(true); }}
                style={{ marginTop: '0.25rem', background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Remover foto
              </button>
            )}
          </div>

          {/* Curriculo */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Currículo (PDF)</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'var(--bg-color)',
              borderRadius: '8px',
              border: `2px dashed ${curriculoPreview ? 'var(--primary)' : 'var(--border-color)'}`,
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
              onClick={() => curriculoInputRef.current?.click()}
              onMouseEnter={(e) => { if (!curriculoPreview) e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { if (!curriculoPreview) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <Upload size={20} color="var(--primary)" />
              <span style={{ fontSize: '0.9rem', opacity: curriculoPreview ? 0.8 : 0.5 }}>
                {curriculoPreview ? 'Clique para trocar o arquivo' : 'Clique para adicionar currículo em PDF'}
              </span>
            </div>
            <input
              ref={curriculoInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                setCurriculo(file);
                setCurriculoPreview(URL.createObjectURL(file));
              }}
            />
            {curriculoPreview && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <a
                  href={curriculoPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Upload size={14} /> Ver currículo
                </a>
                <button
                  type="button"
                  onClick={() => { setCurriculo(null); setCurriculoPreview(null); }}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Nome</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                className="input"
                type="text"
                placeholder="Nome"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <input
                className="input"
                type="text"
                placeholder="Sobrenome"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
            </div>
          </div>

          {/* Working Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'var(--bg-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div>
              <span style={{ fontWeight: '500' }}>Disponível para trabalhos</span>
            </div>
            <button
              type="button"
              onClick={() => setDisponivel(!disponivel)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: disponivel ? '#2ecc71' : '#e74c3c',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              {disponivel ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              {disponivel ? 'Disponível' : 'Indisponível'}
            </button>
          </div>

          {/* Estado e Cidade */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Localização</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select
                className="input"
                value={estado}
                onChange={(e) => { setEstado(e.target.value); setCidade(''); }}
                style={{ flex: '0 0 200px', minWidth: 0 }}
              >
                <option value="">Estado</option>
                {estados.map(uf => (
                  <option key={uf.sigla} value={uf.sigla}>{uf.sigla} - {uf.nome}</option>
                ))}
              </select>
              <select
                className="input"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                style={{ flex: 1 }}
                disabled={!estado || carregandoCidades}
              >
                <option value="">{carregandoCidades ? 'Carregando...' : 'Selecione uma cidade'}</option>
                {cidades.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Telefone + Visibilidade */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Telefone</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input className="input" type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} style={{ flex: 1 }} />
              <button type="button" onClick={() => setTelefoneVisivel(!telefoneVisivel)} title={telefoneVisivel ? 'Visível no perfil' : 'Oculto no perfil'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: telefoneVisivel ? '#2ecc71' : '#e74c3c', display: 'flex', alignItems: 'center', padding: '0.25rem' }}>
                {telefoneVisivel ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
            </div>
          </div>

          {/* Visibilidade Email */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontWeight: '500' }}>Email no perfil</span>
              <span style={{ display: 'block', fontSize: '0.85rem', opacity: 0.7, marginTop: '0.15rem' }}>{authUser?.email}</span>
            </div>
            <button type="button" onClick={() => setEmailVisivel(!emailVisivel)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: emailVisivel ? '#2ecc71' : '#e74c3c', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
              {emailVisivel ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              {emailVisivel ? 'Visível' : 'Oculto'}
            </button>
          </div>

          {/* Redes Sociais */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Redes Sociais <span style={{ fontWeight: '400', fontSize: '0.85rem', opacity: 0.6 }}>(máx. 4)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {redesSociais.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    className="input"
                    value={item.plataforma}
                    onChange={(e) => {
                      const nova = [...redesSociais];
                      nova[idx] = { ...nova[idx], plataforma: e.target.value, nome: e.target.value === 'outro' ? '' : undefined };
                      setRedesSociais(nova);
                    }}
                    style={{ flex: '0 0 160px' }}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="github">GitHub</option>
                    <option value="outro">Outros</option>
                  </select>
                  {item.plataforma === 'outro' && (
                    <input
                      className="input"
                      type="text"
                      placeholder="Nome da rede"
                      value={item.nome || ''}
                      onChange={(e) => {
                        const nova = [...redesSociais];
                        nova[idx] = { ...nova[idx], nome: e.target.value };
                        setRedesSociais(nova);
                      }}
                      style={{ flex: '0 0 140px' }}
                    />
                  )}
                  <input
                    className="input"
                    type="url"
                    placeholder="https://..."
                    value={item.url || ''}
                    onChange={(e) => {
                      const nova = [...redesSociais];
                      nova[idx] = { ...nova[idx], url: e.target.value };
                      setRedesSociais(nova);
                    }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => setRedesSociais(redesSociais.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {redesSociais.length < 4 && (
                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', alignSelf: 'flex-start' }}
                  onClick={() => setRedesSociais([...redesSociais, { plataforma: 'instagram', url: '' }])}>
                  <Plus size={14} /> Adicionar link
                </button>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Biografia</label>
            <textarea className="input" rows="5" value={bio} onChange={(e) => setBio(e.target.value)} style={{ resize: 'none' }}></textarea>
          </div>

          {/* Categories */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Categorias de Serviço</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {categories.map((cat, index) => (
                <div key={index} className="form-row" style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="input" style={{ flex: 1 }} value={cat} onChange={(e) => updateCategory(index, e.target.value)}>
                    <option value="">Selecione uma categoria...</option>
                    {CATEGORIAS_SERVICO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {categories.length > 1 && (
                    <button type="button" className="btn" style={{ padding: '0 1rem', background: 'transparent', color: 'var(--text-color)' }} onClick={() => removeCategory(index)}>X</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.9rem' }} onClick={addCategory}>
                + Adicionar Categoria
              </button>
            </div>
          </div>

          {/* Skills */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Habilidades e Expertise</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {skills.map((skill, index) => (
                <div key={index} className="form-row" style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="input" style={{ flex: 2 }} value={skill.name} onChange={(e) => updateSkill(index, 'name', e.target.value)}>
                    <option value="">Selecione uma habilidade...</option>
                    {HABILIDADES_PROFISSIONAIS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
              <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start', fontSize: '0.9rem' }} onClick={addSkill}>
                + Adicionar Habilidade
              </button>
            </div>
          </div>

          {/* Certificates Section */}
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Formação Acadêmica</label>

            {certificadosExistentes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {certificadosExistentes.map(cert => (
                  <div key={cert.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--bg-color)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{cert.nome_certificado}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{cert.instituicao}</span>
                      </div>
                      {cert.arquivo_url && (
                        <a href={cert.arquivo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                          <Upload size={14} /> Ver
                        </a>
                      )}
                      {!cert.exibir_perfil && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.5, fontStyle: 'italic' }}>(oculto)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoCertificado(cert)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '0.25rem', opacity: 0.6 }}
                        title="Editar certificado"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletarCertificado(cert.id)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.25rem' }}
                        title="Remover certificado"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Certificate Form */}
            <div style={{
              padding: '1rem',
              background: 'var(--bg-color)',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Institution Autocomplete */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Instituição</label>
                  <input
                    ref={instituicaoRef}
                    className="input"
                    type="text"
                    placeholder="Digite o nome da instituição..."
                    value={filtroInstituicao}
                    onChange={(e) => {
                      setFiltroInstituicao(e.target.value);
                      setNovoCertificado(prev => ({ ...prev, instituicao: e.target.value }));
                      setShowInstituicoesDropdown(true);
                    }}
                    onFocus={() => setShowInstituicoesDropdown(true)}
                    onBlur={() => setTimeout(() => setShowInstituicoesDropdown(false), 200)}
                    style={{ width: '100%' }}
                  />
                  {showInstituicoesDropdown && filtroInstituicao && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 100,
                      boxShadow: '0 4px 12px var(--shadow-color)'
                    }}>
                      {instituicoesFiltradas.length > 0 ? (
                        instituicoesFiltradas.map(inst => (
                          <div
                            key={inst.id}
                            onMouseDown={() => selecionarInstituicao(inst.nome)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.9rem',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-opacity)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <Check size={14} color="var(--primary)" />
                            {inst.nome}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', opacity: 0.6 }}>
                          Nenhuma instituição encontrada. Pode digitar manualmente.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Certificate Name */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Nome do Curso / Certificado</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ex: Desenvolvimento Web Full Stack"
                    value={novoCertificado.nome_certificado}
                    onChange={(e) => setNovoCertificado(prev => ({ ...prev, nome_certificado: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Arquivo (opcional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => certificadoFileRef.current?.click()}
                      style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Upload size={14} /> {novoCertificado.arquivo ? 'Trocar arquivo' : 'Anexar arquivo'}
                    </button>
                    <input
                      ref={certificadoFileRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setNovoCertificado(prev => ({ ...prev, arquivo: file }));
                      }}
                    />
                    {novoCertificado.arquivo && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{novoCertificado.arquivo.name}</span>
                    )}
                  </div>
                </div>

                {/* Display toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="exibir-cert"
                    checked={novoCertificado.exibir_perfil}
                    onChange={(e) => setNovoCertificado(prev => ({ ...prev, exibir_perfil: e.target.checked }))}
                  />
                  <label htmlFor="exibir-cert" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Exibir no perfil</label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn dark-text"
                    onClick={adicionarCertificado}
                    style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
                    disabled={!novoCertificado.instituicao || !novoCertificado.nome_certificado}
                  >
                    {editandoCertificado ? 'Atualizar Formação' : 'Salvar Formação'}
                  </button>
                  {editandoCertificado && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cancelarEdicaoCertificado}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Experience Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '500', display: 'block' }}>Experiência Profissional</label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (editandoExperiencia) cancelarEdicaoExperiencia();
                  else setShowExperienciaForm(!showExperienciaForm);
                }}
                style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Plus size={14} /> {showExperienciaForm || editandoExperiencia ? 'Cancelar' : 'Adicionar'}
              </button>
            </div>

            {experiencias.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {experiencias.map(exp => (
                  <div key={exp.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--bg-color)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '8px',
                        background: 'var(--primary-opacity)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Briefcase size={20} color="var(--primary)" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{exp.cargo}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{exp.empresa}{exp.local ? ` - ${exp.local}` : ''}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.15rem' }}>
                          {calcularTempo(exp.data_inicio, exp.data_fim, exp.atual)}
                        </div>
                        {exp.descricao && (
                          <div style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.3rem', lineHeight: 1.4 }}>{exp.descricao}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoExperiencia(exp)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '0.25rem', opacity: 0.6 }}
                        title="Editar experiência"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletarExperiencia(exp.id)}
                        style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
                        title="Remover experiência"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showExperienciaForm && (
              <div style={{
                padding: '1rem',
                background: 'var(--bg-color)',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Empresa *</label>
                    <input className="input" type="text" placeholder="Nome da empresa" value={novaExperiencia.empresa}
                      onChange={(e) => setNovaExperiencia(prev => ({ ...prev, empresa: e.target.value }))} style={{ width: '100%' }} required />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Cargo *</label>
                    <input className="input" type="text" placeholder="Ex: Desenvolvedor Front-end" value={novaExperiencia.cargo}
                      onChange={(e) => setNovaExperiencia(prev => ({ ...prev, cargo: e.target.value }))} style={{ width: '100%' }} required />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Local</label>
                  <input className="input" type="text" placeholder="Ex: São Paulo, SP" value={novaExperiencia.local}
                    onChange={(e) => setNovaExperiencia(prev => ({ ...prev, local: e.target.value }))} style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Data Início *</label>
                    <input className="input" type="date" value={novaExperiencia.data_inicio}
                      onChange={(e) => setNovaExperiencia(prev => ({ ...prev, data_inicio: e.target.value }))} style={{ width: '100%' }} required />
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Data Término</label>
                    <input className="input" type="date" value={novaExperiencia.data_fim}
                      onChange={(e) => setNovaExperiencia(prev => ({ ...prev, data_fim: e.target.value }))}
                      style={{ width: '100%', opacity: novaExperiencia.atual ? 0.4 : 1 }}
                      disabled={novaExperiencia.atual} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.25rem' }}>
                    <input type="checkbox" id="exp-atual" checked={novaExperiencia.atual}
                      onChange={(e) => setNovaExperiencia(prev => ({ ...prev, atual: e.target.checked }))} />
                    <label htmlFor="exp-atual" style={{ fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>Trabalho atual</label>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>Descrição <span style={{ fontWeight: '400', opacity: 0.6 }}>(máx. 5 linhas)</span></label>
                  <textarea className="input" rows="4" placeholder="Descreva suas principais atividades, responsabilidades e conquistas no dia a dia..."
                    value={novaExperiencia.descricao}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      if (lines.length <= 5) {
                        setNovaExperiencia(prev => ({ ...prev, descricao: e.target.value }));
                      }
                    }}
                    style={{ resize: 'none', width: '100%' }}></textarea>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn dark-text"
                    onClick={adicionarExperiencia}
                    style={{ padding: '0.6rem 1rem', fontSize: '0.95rem' }}
                    disabled={!novaExperiencia.empresa || !novaExperiencia.cargo || !novaExperiencia.data_inicio}
                  >
                    {editandoExperiencia ? 'Atualizar Experiência' : 'Adicionar Experiência'}
                  </button>
                  {editandoExperiencia && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cancelarEdicaoExperiencia}
                      style={{ padding: '0.6rem 1rem', fontSize: '0.95rem' }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn dark-text"
            style={{ padding: '1rem', fontSize: '1.2rem', marginTop: '1rem', opacity: enviando ? 0.7 : 1 }}
            disabled={enviando}
          >
            {enviando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      <ModalCrop
        open={cropModalOpen}
        image={cropImage}
        aspect={cropAspect}
        cropShape={cropShape}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
}
