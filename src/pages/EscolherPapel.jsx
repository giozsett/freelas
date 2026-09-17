import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Building2, Check } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';

const API_URL = 'http://localhost:8000';

export default function EscolherPapel() {
  const { user, token, ajustarPapel } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(null);
  const [erro, setErro] = useState('');

  const opcoes = [
    {
      valor: 'freelancer',
      titulo: 'Sou freelancer',
      descricao: 'Ofereço meus serviços: crio trabalhos, me candidato a anúncios e recebo propostas.',
      icone: Briefcase,
    },
    {
      valor: 'empresa',
      titulo: 'Sou empresa',
      descricao: 'Busco profissionais: publico anúncios, recebo propostas e contrato freelancers.',
      icone: Building2,
    },
  ];

  const escolher = async (valor) => {
    if (saving) return;
    setSaving(valor);
    setErro('');
    try {
      const res = await fetch(`${API_URL}/api/auth/profile/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ papel: valor }),
      });
      if (!res.ok) throw new Error('Não foi possível salvar sua escolha. Tente novamente.');
      ajustarPapel(valor);
      const primeiraVez = sessionStorage.getItem('freelas_primeira_vez');
      sessionStorage.removeItem('freelas_primeira_vez');
      navigate(primeiraVez ? '/subscription-setup' : '/', { replace: true });
    } catch (err) {
      setErro(err.message || 'Erro ao salvar. Tente novamente.');
      setSaving(null);
    }
  };

  if (user?.profile?.papel) {
    const jaEscolhido = user.profile.papel === 'empresa' ? 'Empresa' : 'Freelancer';
    const Icone = user.profile.papel === 'empresa' ? Building2 : Briefcase;
    return (
      <div className="card" style={styles.cardEstado}>
        <div style={styles.circulo}>
          <Icone size={28} />
        </div>
        <h2 style={styles.titulo}>Você já é {jaEscolhido}</h2>
        <p style={styles.subtitulo}>Seu tipo de conta já está definido e pode ser alterado em Configurações.</p>
        <button className="btn" onClick={() => navigate('/', { replace: true })} style={{ marginTop: '1rem' }}>
          Ir para o início
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={styles.wrapper}>
      <div style={styles.cabecalho}>
        <h1 style={styles.h1}>Como você quer usar o Freelas?</h1>
        <p style={styles.subtitulo}>
          Escolha seu tipo de conta. Você pode alterar depois em Configurações.
        </p>
      </div>

      <div style={styles.grade}>
        {opcoes.map((opcao) => {
          const Icone = opcao.icone;
          const ativo = role === (opcao.valor === 'empresa' ? 'contractor' : 'freelancer');
          const carregando = saving === opcao.valor;
          return (
            <button
              key={opcao.valor}
              className="card ep-card"
              onClick={() => escolher(opcao.valor)}
              disabled={!!saving}
              style={{ ...styles.cartao, ...(saving && styles.cartaoDesabilitado) }}
            >
              <div style={styles.circulo}>
                <Icone size={30} />
              </div>
              <h3 style={styles.h3}>{opcao.titulo}</h3>
              <p style={styles.descricao}>{opcao.descricao}</p>
              <span className="btn" style={styles.acoes}>
                {carregando ? 'Salvando...' : ativo ? <><Check size={18} /> Tipo atual</> : 'Escolher'}
              </span>
            </button>
          );
        })}
      </div>

      {erro && <p style={styles.erro}>{erro}</p>}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: '900px',
    textAlign: 'center',
  },
  cardEstado: {
    maxWidth: '480px',
    margin: '4rem auto',
    padding: '2rem',
    textAlign: 'center',
  },
  cabecalho: {
    marginBottom: '2rem',
  },
  h1: {
    fontSize: '1.75rem',
    marginBottom: '0.5rem',
  },
  h3: {
    fontSize: '1.1rem',
    marginTop: '1rem',
    marginBottom: '0.4rem',
  },
  subtitulo: {
    color: 'var(--text-secondary)',
    margin: 0,
  },
  grade: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.25rem',
  },
  cartao: {
    cursor: 'pointer',
    padding: '1.75rem 1.5rem',
    textAlign: 'left',
    border: '1px solid var(--border-color)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  },
  cartaoDesabilitado: {
    opacity: 0.6,
    cursor: 'default',
  },
  circulo: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--secondary)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  descricao: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: 0,
    marginBottom: '1.25rem',
  },
  acoes: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
  },
  erro: {
    color: 'var(--danger-color)',
    marginTop: '1.25rem',
  },
};