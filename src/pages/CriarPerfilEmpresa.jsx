import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserRound, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

const API_URL = 'http://localhost:8000';

export default function CriarPerfilEmpresa() {
  const { user, token, ajustarPapel } = useAuth();
  const navigate = useNavigate();

  const [passo, setPasso] = useState(1);
  const [tipo, setTipo] = useState(null);
  const [form, setForm] = useState({
    nome_empresa: '',
    ramo_empresa: '',
    porte_empresa: '',
    cnpj: '',
    site_empresa: '',
    bio_empresa: '',
  });
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Quem já tem perfil de empresa configurado não precisa recriar
  const jaEmpresaConfigurada = user?.profile?.papel === 'empresa' && user?.profile?.tipo_empresa;
  useEffect(() => {
    if (jaEmpresaConfigurada) navigate('/', { replace: true });
  }, [jaEmpresaConfigurada, navigate]);

  const atualizar = (campo) => (e) => setForm(prev => ({ ...prev, [campo]: e.target.value }));

  const conferirForm = () => {
    if (!form.nome_empresa.trim()) return 'Informe o nome da empresa.';
    if (!form.ramo_empresa.trim()) return 'Informe o ramo/segmento da empresa.';
    if (!form.bio_empresa.trim()) return 'Conte o que a empresa faz.';
    if (form.site_empresa && !/^https?:\/\/.+\..+/.test(form.site_empresa)) return 'O site precisa começar com http:// ou https://.';
    return '';
  };

  const confirmar = async () => {
    setErro('');
    if (!tipo) { setErro('Escolha como você vai atuar como contratante.'); return; }
    if (!aceitouTermos) { setErro('Você precisa aceitar os Termos de Uso do perfil de empresa/contratante.'); return; }
    if (tipo === 'cnpj') {
      const invalido = conferirForm();
      if (invalido) { setErro(invalido); return; }
    }
    setSalvando(true);
    try {
      const payload = {
        papel: 'empresa',
        tipo_empresa: tipo,
        aceitou_termos_empresa: true,
        ...(tipo === 'cnpj' ? {
          nome_empresa: form.nome_empresa.trim(),
          ramo_empresa: form.ramo_empresa.trim(),
          porte_empresa: form.porte_empresa,
          cnpj: form.cnpj.trim(),
          site_empresa: form.site_empresa.trim(),
          bio_empresa: form.bio_empresa.trim(),
        } : {}),
      };
      const res = await fetch(`${API_URL}/api/auth/profile/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.nome_empresa || data.ramo_empresa || data.bio_empresa || data.tipo_empresa || data.aceitou_termos_empresa || 'Não foi possível criar o perfil de empresa.';
        throw new Error(Array.isArray(msg) ? msg[0] : msg);
      }
      ajustarPapel('empresa');
      const primeiraVez = sessionStorage.getItem('freelas_primeira_vez');
      sessionStorage.removeItem('freelas_primeira_vez');
      navigate(primeiraVez ? '/subscription-setup' : '/', { replace: true });
    } catch (err) {
      setErro(err.message || 'Erro ao criar o perfil. Tente novamente.');
      setSalvando(false);
    }
  };

  const opcoesTipo = [
    {
      valor: 'pessoa',
      titulo: 'Sou uma pessoa',
      descricao: 'Quero contratar serviços sem ter CNPJ. Uso meu próprio perfil para isso.',
      icone: UserRound,
    },
    {
      valor: 'cnpj',
      titulo: 'Tenho uma empresa (CNPJ)',
      descricao: 'Vou criar o perfil da empresa: nome, ramo, o que ela faz e validação de contratante.',
      icone: Building2,
    },
  ];

  return (
    <div className="container" style={{ maxWidth: '640px' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{ ...estilos.circulo, background: 'var(--secondary)', color: 'var(--primary)' }}>
          <Building2 size={30} />
        </div>
        <h1 style={{ fontSize: '1.6rem', marginTop: '0.75rem', marginBottom: '0.4rem' }}>
          Criar perfil de empresa/contratante
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Passo {passo} de 3 — ao confirmar, sua conta passa a atuar como empresa.
        </p>
      </div>

      <div className="card" style={{ padding: '1.75rem 1.5rem' }}>
        {passo === 1 && (
          <>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Como você vai atuar como contratante?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Empresas com CNPJ criam um perfil com os dados da organização (estilo LinkedIn). Quem não tem CNPJ pode reutilizar o próprio perfil.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {opcoesTipo.map(opcao => {
                const Icone = opcao.icone;
                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    className="card"
                    onClick={() => { setTipo(opcao.valor); setPasso(opcao.valor === 'cnpj' ? 2 : 3); }}
                    style={{ ...estilos.opcao, border: tipo === opcao.valor ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}
                  >
                    <div style={{ ...estilos.circulo, background: 'var(--secondary)', color: 'var(--primary)' }}>
                      <Icone size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', marginTop: '0.9rem', marginBottom: '0.35rem' }}>{opcao.titulo}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{opcao.descricao}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {passo === 2 && tipo === 'cnpj' && (
          <>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Dados da empresa</h2>
            <div style={estilos.formulario}>
              <div>
                <label style={estilos.label}>Nome da empresa *</label>
                <input className="input" style={{ width: '100%' }} value={form.nome_empresa} onChange={atualizar('nome_empresa')} placeholder="Ex.: Clínica Pet Feliz LTDA" />
              </div>
              <div>
                <label style={estilos.label}>Ramo / segmento *</label>
                <input className="input" style={{ width: '100%' }} value={form.ramo_empresa} onChange={atualizar('ramo_empresa')} placeholder="Ex.: Saúde, Tecnologia..." />
              </div>
              <div>
                <label style={estilos.label}>Porte da empresa (opcional)</label>
                <select className="input" style={{ width: '100%' }} value={form.porte_empresa} onChange={atualizar('porte_empresa')}>
                  <option value="">Selecione...</option>
                  <option value="autonomo">Autônomo</option>
                  <option value="micro">Micro (até 9 funcionários)</option>
                  <option value="pequena">Pequena (10 a 49)</option>
                  <option value="media">Média (50 a 249)</option>
                  <option value="grande">Grande (250+)</option>
                </select>
              </div>
              <div>
                <label style={estilos.label}>CNPJ (opcional)</label>
                <input className="input" style={{ width: '100%' }} value={form.cnpj} onChange={atualizar('cnpj')} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label style={estilos.label}>Site da empresa (opcional)</label>
                <input className="input" style={{ width: '100%' }} value={form.site_empresa} onChange={atualizar('site_empresa')} placeholder="https://..." />
              </div>
              <div>
                <label style={estilos.label}>O que a empresa faz? *</label>
                <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical' }} value={form.bio_empresa} onChange={atualizar('bio_empresa')} placeholder="Descreva a empresa: área de atuação, serviços, porte e o tipo de profissional que procura..." />
              </div>
            </div>
            <div style={estilos.passosBtns}>
              <button type="button" className="btn btn-secondary" onClick={() => setPasso(1)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button type="button" className="btn" onClick={() => setPasso(3)}>
                Revisar e confirmar <Check size={16} />
              </button>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Revisão e termos</h2>

            <div className="card" style={{ background: 'var(--secondary)', border: 'none', marginBottom: '1.25rem' }}>
              {tipo === 'pessoa' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <UserRound size={18} color="var(--primary)" />
                    <strong>Pessoa física contratante</strong>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-secondary)' }}>
                    Você usará seu perfil pessoal para contratar serviços, exatamente como está hoje.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Building2 size={18} color="var(--primary)" />
                    <strong>{form.nome_empresa}</strong>
                  </div>
                  {Object.entries({
                    'Ramo / segmento': form.ramo_empresa,
                    'Porte': form.porte_empresa ? (`${form.porte_empresa[0].toUpperCase()}${form.porte_empresa.slice(1)}`) : 'Não informado',
                    'CNPJ': form.cnpj || 'Não informado',
                    'Site': form.site_empresa || 'Não informado',
                  }).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.25rem 0' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                      <span style={{ textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                  <p style={{ fontSize: '0.9rem', margin: '0.75rem 0 0', color: 'var(--text-secondary)' }}>{form.bio_empresa}</p>
                </>
              )}
            </div>

            <div style={estilos.termos}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                Termos de Uso — Perfil de empresa/contratante
              </strong>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.6', margin: 0 }}>
                Declaro que estou criando um perfil de <strong>empresa/contratante</strong> no Freelas. Ao atuar como
                Empresa, minha conta passa a ser uma <strong>Contratante</strong>: posso publicar anúncios em busca de
                um serviço, receber propostas de freelancers e contratar profissionais — tanto como <strong>pessoa
                física</strong> (sem CNPJ, usando meu perfil pessoal) quanto como <strong>empresa com CNPJ</strong> (usando
                o perfil da organização). As informações prestadas identificam a organização representada e passam a
                compor o perfil exibido publicamente enquanto a conta atuar como empresa. Tenho autoridade para
                representar esta organização e me responsabilizo pela veracidade dos dados informados. Ao contratar
                serviços, este perfil firma acordos como contratante, com as obrigações legais, fiscais e de
                responsabilidade previstas nos Termos de Uso gerais da plataforma. Entendo que posso voltar a atuar
                como freelancer a qualquer momento usando o mesmo perfil pessoal.
              </p>
            </div>

            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} style={{ marginTop: '0.15rem' }} />
              <span>
                Li e aceito estes Termos e confirmo a criação do <strong>perfil de empresa/contratante</strong>.
              </span>
            </label>

            {erro && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginTop: '1rem' }}>{erro}</p>}

            <div style={estilos.passosBtns}>
              <button type="button" className="btn btn-secondary" onClick={() => setPasso(tipo === 'cnpj' ? 2 : 1)}>
                <ArrowLeft size={16} /> Voltar
              </button>
              <button type="button" className="btn" disabled={salvando} onClick={confirmar} style={{ opacity: salvando ? 0.6 : 1 }}>
                <ShieldCheck size={17} />
                {salvando ? 'Criando perfil...' : 'Confirmar e virar empresa'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const estilos = {
  circulo: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  opcao: {
    cursor: 'pointer',
    textAlign: 'left',
    padding: '1.25rem',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  formulario: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  label: {
    fontWeight: '500',
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.9rem',
  },
  termos: {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '1rem',
  },
  passosBtns: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    marginTop: '1.5rem',
  },
};