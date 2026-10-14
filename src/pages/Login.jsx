import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/ContextoAutenticacao';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const destinoPosLogin = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/';

  useEffect(() => {
    if (location.state?.linkedinError) {
      setErrorMsg(location.state.linkedinError);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Preencha o email e a senha para realizar o login.');
      return;
    }
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      const data = await response.json();
      if (response.ok) {
        login(data.user, data.token);
        navigate(destinoPosLogin, { replace: true });
      } else if (data.error === 'email_not_found') {
        setErrorMsg('Email inválido. Confira o email digitado ou cadastre-se se ainda não tiver uma conta.');
      } else {
        setErrorMsg(
          data.error && data.error !== 'Wrong Credentials'
            ? data.error
            : 'E-mail ou senha incorretos.'
        );
      }
    } catch (err) {
      setErrorMsg('E-mail ou senha incorretos.');
    }
  };

  const handleLinkedinLogin = () => {
    setErrorMsg('');
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    if (!clientId) {
      setErrorMsg('Login com LinkedIn não configurado. Tente novamente.');
      return;
    }
    const redirectUri = `${window.location.origin}/linkedin-callback`;
    const state = crypto.randomUUID();
    sessionStorage.setItem('linkedinOAuthState', state);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
    });
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrorMsg('');
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      setErrorMsg('Não foi possível obter o login do Google. Tente novamente.');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/auth/google/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.user, data.token);
        navigate(destinoPosLogin, { replace: true });
      } else {
        setErrorMsg(data.error || 'Erro ao entrar com o Google. Tente novamente.');
      }
    } catch (err) {
      setErrorMsg('Erro ao entrar com o Google. Tente novamente.');
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div style={{ maxWidth: '400px', margin: '1.5rem auto' }}>
        <div className="card fade-in">
          <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Bem vindo ao <span className="brand-gradient-text">Freelas</span></h1>
          {errorMsg && <div className="form-error" style={{ color: 'var(--danger-color)', background: 'var(--danger-soft)', border: '1px solid var(--danger-color)', borderRadius: '4px', padding: '0.65rem 0.8rem', marginBottom: '1rem', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'pre-line', fontFamily: "'Outfit', sans-serif" }}>{errorMsg}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>E-mail <span style={{ color: 'var(--danger-color)' }}>*</span></label>
              <input
                type="email"
                className="input"
                style={{ padding: '0.6rem 0.9rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
              />
            </div>
            <div>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Senha <span style={{ color: 'var(--danger-color)' }}>*</span></label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Link to="/esqueci-senha" style={{ fontSize: '0.8rem', textDecoration: 'underline', color: 'var(--text-secondary, #888)' }}>
                Esqueci minha senha
              </Link>
            </div>
            <button type="submit" className="btn dark-text" style={{ marginTop: '1rem', width: '100%' }}>
              Entrar
            </button>
          </form>

          <div style={{ margin: '1rem 0', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)', zIndex: 1 }}></div>
            <span style={{ position: 'relative', zIndex: 2, background: 'var(--surface-color)', padding: '0 1rem', fontWeight: 'bold', fontSize: '0.8rem' }}>OU</span>
          </div>

          <div style={{ maxWidth: '368px', margin: '0 auto' }}>
            <div className="social-btn-overlay">
              <div className="social-btn-overlay__visual btn-social" aria-hidden="true">
                <GoogleIcon />
                Fazer login com o Google
              </div>
              <div className="social-btn-overlay__real">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg('Erro ao entrar com o Google. Tente novamente.')}
                  text="signin_with"
                  shape="rectangular"
                  logo_alignment="left"
                  width="368"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-social"
              style={{ marginTop: '0.75rem' }}
              onClick={handleLinkedinLogin}
            >
              <LinkedinIcon />
              Fazer login com o LinkedIn
            </button>
          </div>

          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            Não tem uma conta? <Link to="/register" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Cadastre-se</Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}