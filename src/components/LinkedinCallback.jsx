import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';

export default function LinkedinCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [msg, setMsg] = useState('Conectando com o LinkedIn...');
  const executado = useRef(false);

  useEffect(() => {
    if (executado.current) return;
    executado.current = true;

    let timeout;
    const cancel = (text) => {
      setMsg(text);
      timeout = setTimeout(() => navigate('/login', { state: { linkedinError: text } }), 1800);
    };

    const params = new URLSearchParams(window.location.search);
    window.history.replaceState(null, '', window.location.pathname);

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const savedState = sessionStorage.getItem('linkedinOAuthState');
    const destino = sessionStorage.getItem('linkedinOAuthDestino') || 'login';
    sessionStorage.removeItem('linkedinOAuthState');
    sessionStorage.removeItem('linkedinOAuthDestino');
    if (error) {
      cancel('Erro ao entrar com o LinkedIn. Tente novamente.');
      return;
    }
    if (!code || !savedState || state !== savedState) {
      cancel('Falha na autenticação com o LinkedIn. Tente novamente.');
      return;
    }

    const finish = async () => {
      try {
        const redirectUri = `${window.location.origin}/linkedin-callback`;
        const response = await fetch('http://localhost:8000/api/auth/linkedin/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });
        const data = await response.json();
        if (response.ok) {
          login(data.user, data.token);
          if (destino === 'cadastro') sessionStorage.setItem('freelas_primeira_vez', '1');
          navigate(destino === 'cadastro' ? '/subscription-setup' : '/');
        } else {
          cancel(data.error || 'Erro ao entrar com o LinkedIn.');
        }
      } catch (err) {
        cancel('Erro interno de conexão.');
      }
    };
    finish();

    return () => clearTimeout(timeout);
  }, [login, navigate]);

  return (
    <div style={{ maxWidth: '400px', margin: '6rem auto' }}>
      <div className="card fade-in">
        <p style={{ textAlign: 'center' }}>{msg}</p>
      </div>
    </div>
  );
}