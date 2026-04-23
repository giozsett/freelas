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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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

  const passwordStrength = checkPasswordStrength(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem!');
      return;
    }
    if (passwordStrength === 'Fraca') {
      setErrorMsg('Sua senha é Fraca. Utilize letras e números no mínimo.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('Você precisa concordar com os Termos de Uso.');
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
        navigate('/subscription-setup');
      } else {
        if (data.username || data.email) {
          setErrorMsg('Já há um usuário cadastrado com esse email.');
        } else {
          setErrorMsg('Erro ao cadastrar. Verifique os dados.');
        }
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  const handleScrollTerms = (e) => {
    if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 2) {
      setTermsScrolled(true);
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

        {errorMsg && <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid #ff6b6b', borderRadius: '4px', padding: '0.8rem', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}

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

          {password && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Força da senha:</span>
                <span style={{ 
                  fontWeight: 'bold',
                  color: passwordStrength === 'Forte' ? '#1dd1a1' : passwordStrength === 'Média' ? '#feca57' : '#ff6b6b' 
                }}>
                  {passwordStrength}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                <div style={{ flex: 1, borderRadius: '3px', background: passwordStrength ? (passwordStrength === 'Fraca' ? '#ff6b6b' : passwordStrength === 'Média' ? '#feca57' : '#1dd1a1') : 'var(--border-color)' }}></div>
                <div style={{ flex: 1, borderRadius: '3px', background: (passwordStrength === 'Média' || passwordStrength === 'Forte') ? (passwordStrength === 'Média' ? '#feca57' : '#1dd1a1') : 'var(--border-color)' }}></div>
                <div style={{ flex: 1, borderRadius: '3px', background: passwordStrength === 'Forte' ? '#1dd1a1' : 'var(--border-color)' }}></div>
              </div>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem', lineHeight: '1.4' }}>
                Forte: Mínimo 1 letra maiúscula, 1 número e 1 caractere especial.<br />
                Média: Letras e números.<br />
                Fraca: Apenas letras ou números (não permitida).
              </p>
            </div>
          )}

          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <input 
              type="checkbox" 
              checked={agreedToTerms} 
              onChange={() => {
                if (!agreedToTerms) setIsTermsModalOpen(true);
                else setAgreedToTerms(false);
              }}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
            <label style={{ fontSize: '0.9rem' }}>
              Li e concordo com os <span style={{ color: 'var(--holo-salmon)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsTermsModalOpen(true)}>Termos de Uso</span>
            </label>
          </div>

          <button type="submit" className="btn dark-text" style={{ marginTop: '1rem', width: '100%' }}>
            Cadastrar
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          Já tem uma conta? <Link to="/login" style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Entre aqui</Link>
        </p>
      </div>

      {isTermsModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Termos de Uso</h2>
            <div 
              onScroll={handleScrollTerms}
              style={{ 
                flex: 1, overflowY: 'auto', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-color)', marginBottom: '1rem', lineHeight: '1.6'
              }}
            >
              <p style={{ marginBottom: '1rem' }}>Bem-vindo ao Freelas. Ao utilizar nossa plataforma, você concorda com as seguintes condições:</p>
              <h3 style={{ marginBottom: '0.5rem' }}>1. Uso da Plataforma</h3>
              <p style={{ marginBottom: '1rem' }}>Você se compromete a usar a plataforma apenas para fins legais e de forma que não infrinja os direitos de, nem restrinja ou iniba o uso e usufruto desta plataforma por terceiros.</p>
              <h3 style={{ marginBottom: '0.5rem' }}>2. Privacidade</h3>
              <p style={{ marginBottom: '1rem' }}>Coletamos e armazenamos informações essenciais para a operação do serviço. Suas senhas são criptografadas.</p>
              <h3 style={{ marginBottom: '0.5rem' }}>3. Responsabilidades</h3>
              <p style={{ marginBottom: '1rem' }}>A plataforma não se responsabiliza por acordos fechados diretamente entre freelancers e contratantes. Somos um facilitador de conexões.</p>
              <p style={{ marginBottom: '1rem' }}>Por favor, denuncie qualquer comportamento abusivo através da nossa ferramenta de moderação integrada.</p>
              <p style={{ marginBottom: '3rem' }}>(Continue lendo...)</p>
              <p style={{ marginBottom: '3rem' }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
              <p style={{ marginBottom: '3rem' }}>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              <p style={{ fontWeight: 'bold' }}>Fim dos termos. Você já pode concordar.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setIsTermsModalOpen(false)}>Cancelar</button>
              <button 
                className="btn dark-text" 
                disabled={!termsScrolled}
                style={{ opacity: termsScrolled ? 1 : 0.5, cursor: termsScrolled ? 'pointer' : 'not-allowed' }}
                onClick={() => {
                  setAgreedToTerms(true);
                  setIsTermsModalOpen(false);
                }}
              >
                Concordar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
