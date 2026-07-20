import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EsqueciSenha() {
  const [etapa, setEtapa] = useState('email'); // 'email', 'codigo', 'nova_senha'
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const checkPasswordStrength = (pwd) => {
    if (!pwd) return '';
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
    if (hasUppercase && hasNumbers && hasSpecial) return 'Forte';
    if (hasLetters && hasNumbers) return 'Média';
    return 'Fraca';
  };

  const passwordStrength = checkPasswordStrength(novaSenha);

  const handleEnviarCodigo = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:8000/api/auth/solicitar-redefinicao/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setEtapa('codigo');
      } else {
        setErrorMsg(data.error || 'Erro ao enviar o código.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!codigo) {
      setErrorMsg('Digite o código recebido no email.');
      return;
    }
    setEtapa('nova_senha');
  };

  const handleRedefinirSenha = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (novaSenha !== confirmarSenha) {
      setErrorMsg('As senhas não coincidem!');
      return;
    }
    if (passwordStrength === 'Fraca') {
      setErrorMsg('Sua senha é Fraca. Utilize letras e números no mínimo.');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/auth/redefinir-senha/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, codigo, nova_senha: novaSenha }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg('Senha redefinida com sucesso! Redirecionando...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setErrorMsg(data.error || 'Erro ao redefinir a senha.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  const handleReenviarCodigo = async () => {
    setErrorMsg('');
    try {
      await fetch('http://localhost:8000/api/auth/solicitar-redefinicao/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSuccessMsg('Código reenviado para o seu email!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Erro ao reenviar o código.');
    }
  };

  // ── Etapa 1: Email ──
  if (etapa === 'email') {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <div className="card">
          <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Esqueci minha senha</h1>
          <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Digite o email da sua conta e enviaremos um código de verificação.
          </p>
          <form onSubmit={handleEnviarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>E-mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemplo@email.com"
              />
            </div>
            {errorMsg && <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: '4px', padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}
            <button type="submit" className="btn dark-text" style={{ marginTop: '0.5rem', width: '100%' }}>
              Enviar código
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Etapa 2: Código ──
  if (etapa === 'codigo') {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <div className="card">
          <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Verifique seu email</h1>
          <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Enviamos um código de 6 dígitos para <strong>{email}</strong>. Ele expira em 10 minutos.
          </p>
          <form onSubmit={handleVerificarCodigo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Código de verificação</label>
              <input
                type="text"
                className="input"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
                placeholder="000000"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
              />
            </div>
            {errorMsg && <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: '4px', padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: '#1dd1a1', background: 'rgba(29,209,161,0.1)', border: '1px solid #1dd1a1', borderRadius: '4px', padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{successMsg}</div>}
            <button type="submit" className="btn dark-text" style={{ marginTop: '0.5rem', width: '100%' }}>
              Verificar código
            </button>
          </form>
          <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem' }}>
            Não recebeu o código?{' '}
            <span style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }} onClick={handleReenviarCodigo}>
              Reenviar
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── Etapa 3: Nova senha ──
  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="card">
        <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Nova senha</h1>
        <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Digite sua nova senha abaixo.
        </p>
        <form onSubmit={handleRedefinirSenha} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Nova senha</label>
            <input
              type="password"
              className="input"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              placeholder="Sua nova senha"
            />
          </div>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Confirme a nova senha</label>
            <input
              type="password"
              className="input"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              placeholder="Confirme"
            />
          </div>

          {novaSenha && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Força da senha:</span>
                <span style={{ fontWeight: 'bold', color: passwordStrength === 'Forte' ? '#1dd1a1' : passwordStrength === 'Média' ? '#feca57' : '#ff6b6b' }}>
                  {passwordStrength}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                <div style={{ flex: 1, borderRadius: '3px', background: passwordStrength ? (passwordStrength === 'Fraca' ? '#ff6b6b' : passwordStrength === 'Média' ? '#feca57' : '#1dd1a1') : 'var(--border-color)' }}></div>
                <div style={{ flex: 1, borderRadius: '3px', background: (passwordStrength === 'Média' || passwordStrength === 'Forte') ? (passwordStrength === 'Média' ? '#feca57' : '#1dd1a1') : 'var(--border-color)' }}></div>
                <div style={{ flex: 1, borderRadius: '3px', background: passwordStrength === 'Forte' ? '#1dd1a1' : 'var(--border-color)' }}></div>
              </div>
            </div>
          )}

          {errorMsg && <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: '4px', padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}
          {successMsg && <div style={{ color: '#1dd1a1', background: 'rgba(29,209,161,0.1)', border: '1px solid #1dd1a1', borderRadius: '4px', padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{successMsg}</div>}

          <button type="submit" className="btn dark-text" style={{ marginTop: '0.5rem', width: '100%' }}>
            Redefinir senha
          </button>
        </form>
      </div>
    </div>
  );
}