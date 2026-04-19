import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function ModeratorLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simplified mock logic since we don't have complete roles on backend token yet
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('isModerator', 'true');
      alert('Login efetuado com sucesso.');
      navigate('/moderation-panel');
    } else {
      alert('Credenciais inválidas. Tente admin / admin.');
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
          
          <button type="submit" className="btn dark-text" style={{ marginTop: '0.5rem', padding: '1rem' }}>
            Acessar Painel
          </button>
        </form>
      </div>
    </div>
  );
}
