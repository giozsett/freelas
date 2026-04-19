import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: '8px' }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem!');
      return;
    }
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:8000/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, email, password, first_name: name })
      });
      const data = await response.json();
      if (response.ok) {
        login(data.user, data.token);
        navigate('/');
      } else {
        setErrorMsg('Erro ao cadastrar. Esse email já pode estar em uso.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '4rem auto' }}>
      <div className="card">
        <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Crie sua conta</h1>

        {/* Google Authentication disabled temporarily */}
        <button onClick={() => { }} className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleIcon /> Cadastrar com o Google
        </button>

        <div style={{ margin: '1.5rem 0', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)', zIndex: 1 }}></div>
          <span style={{ position: 'relative', zIndex: 2, background: 'var(--surface-color)', padding: '0 1rem', fontWeight: 'bold', fontSize: '0.8rem' }}>OU CRIE COM EMAIL</span>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Nome Completo</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Seu nome"
            />
          </div>
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
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Senha</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Sua senha"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Confirme a Senha</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirme"
              />
            </div>
          </div>

          {errorMsg && <div style={{ color: 'red', marginTop: '0.5rem', textAlign: 'center', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <button type="submit" className="btn dark-text" style={{ marginTop: '1rem', width: '100%' }}>
            Cadastrar
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Já tem uma conta? <Link to="/login" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Entre aqui</Link>
        </p>
      </div>
    </div>
  );
}
