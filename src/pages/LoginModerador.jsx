import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';

export default function ModeratorLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error('Usuário ou senha inválidos.');
      }
      if (!data.user?.is_staff) {
        throw new Error('Este usuário não possui permissão administrativa.');
      }
      login(data.user, data.token);
      localStorage.setItem('isModerator', 'true');
      navigate('/moderation-panel');
    } catch (err) {
      localStorage.removeItem('isModerator');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="card" style={{ borderTop: '4px solid var(--holo-purple-real)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={48} color="var(--holo-purple-real)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Acesso Restrito</h1>
          <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>Login para Moderadores</p>
        </div>

        {error && (
          <div style={{ color: '#ff4757', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Usuário</label>
            <input 
              type="text" 
              className="input" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Senha</label>
            <input 
              type="password" 
              className="input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn dark-text" style={{ marginTop: '0.5rem', padding: '1rem' }}>
            {loading ? 'Entrando...' : 'Acessar Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
