import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useDialogo } from '../context/ContextoDialogo';
import { checkPasswordStrength } from '../utils/validacaoSenha';

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

export default function Cadastro() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);

  // novos estados para o fluxo de verificação
  const [etapa, setEtapa] = useState('cadastro'); // 'cadastro' ou 'verificacao'
  const [codigo, setCodigo] = useState('');
  const [emailCadastrado, setEmailCadastrado] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();
  const { alerta } = useDialogo();

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
      // 1. Cadastra o usuário
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
        const emailError = Array.isArray(data.email) ? data.email[0] : data.email;
        const usernameError = Array.isArray(data.username) ? data.username[0] : data.username;
        setErrorMsg(emailError || usernameError || 'Erro ao cadastrar. Verifique os dados.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:8000/api/auth/verificar-codigo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailCadastrado, codigo })
      });
      const data = await response.json();
      if (response.ok) {
        login(data.user, data.token);
        navigate('/subscription-setup');
      } else {
        setErrorMsg(data.error || 'Código inválido. Tente novamente.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  const handleReenviarCodigo = async () => {
    setErrorMsg('');
    try {
      await fetch('http://localhost:8000/api/auth/enviar-codigo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailCadastrado })
      });
      setErrorMsg('');
      await alerta('Código reenviado para o seu email!', { titulo: 'Código enviado', variante: 'sucesso' });
    } catch (err) {
      setErrorMsg('Erro ao reenviar o código.');
    }
  };

  const handleGoogleRegister = async (credentialResponse) => {
    setErrorMsg('');
    try {
      const response = await fetch('http://localhost:8000/api/auth/google/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.user, data.token);
        navigate('/subscription-setup');
      } else {
        setErrorMsg(data.error || 'Erro ao cadastrar com o Google. Tente novamente.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão.');
    }
  };

  const handleLinkedinRegister = () => {
    setErrorMsg('');
    const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
    if (!clientId) {
      setErrorMsg('Cadastro com LinkedIn não configurado. Tente novamente.');
      return;
    }
    const redirectUri = `${window.location.origin}/linkedin-callback`;
    const state = crypto.randomUUID();
    sessionStorage.setItem('linkedinOAuthState', state);
    sessionStorage.setItem('linkedinOAuthDestino', 'cadastro');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
    });
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  };

  const handleScrollTerms = (e) => {
    if (e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 2) {
      setTermsScrolled(true);
    }
  };

  // ── Etapa de verificação de código ──
  if (etapa === 'verificacao') {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <div className="card fade-in">
          <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Verifique seu email</h1>
          <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Enviamos um código de 6 dígitos para <strong>{emailCadastrado}</strong>. Ele expira em 10 minutos.
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
            {errorMsg && <div className="form-error" style={{ color: 'var(--danger-color)', background: 'var(--danger-soft)', border: '1px solid var(--danger-color)', borderRadius: '4px', padding: '0.8rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}
            <button type="submit" className="btn dark-text" style={{ marginTop: '0.5rem', width: '100%' }}>
              Verificar
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

  // ── Etapa de cadastro ──
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div style={{ maxWidth: '500px', margin: '4rem auto' }}>
        <div className="card fade-in">
          <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Crie sua conta</h1>

          <div style={{ maxWidth: '468px', margin: '0 auto 1.5rem' }}>
            <div className="social-btn-overlay">
              <div className="social-btn-overlay__visual btn-social" aria-hidden="true">
                <GoogleIcon />
                Cadastrar com o Google
              </div>
              <div className="social-btn-overlay__real">
                <GoogleLogin
                  onSuccess={handleGoogleRegister}
                  onError={() => setErrorMsg('Erro ao cadastrar com o Google. Tente novamente.')}
                  text="signup_with"
                  shape="rectangular"
                  logo_alignment="left"
                  width="468"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn-social"
              style={{ marginTop: '0.75rem' }}
              onClick={handleLinkedinRegister}
            >
              <LinkedinIcon />
              Cadastrar com o LinkedIn
            </button>
          </div>

          {errorMsg && <div className="form-error" style={{ color: 'var(--danger-color)', background: 'var(--danger-soft)', border: '1px solid var(--danger-color)', borderRadius: '4px', padding: '0.8rem', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>{errorMsg}</div>}

          <div style={{ margin: '1.5rem 0', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)', zIndex: 1 }}></div>
            <span style={{ position: 'relative', zIndex: 2, background: 'var(--surface-color)', padding: '0 1rem', fontWeight: 'bold', fontSize: '0.8rem' }}>OU CRIE COM EMAIL</span>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Nome Completo</label>
              <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
            </div>
            <div>
              <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>E-mail</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="exemplo@email.com" />
            </div>
            <div className="form-row">
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Senha</label>
                <div className="password-field">
                  <input type={showPassword ? 'text' : 'password'} className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Sua senha" />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Confirme a Senha</label>
                <input type={showPassword ? 'text' : 'password'} className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirme" />
              </div>
            </div>

            {password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span>Força da senha:</span>
                  <span style={{ fontWeight: 'bold', color: passwordStrength === 'Forte' ? 'var(--success-color)' : passwordStrength === 'Média' ? 'var(--warning-color)' : 'var(--danger-color)' }}>
                    {passwordStrength}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
                  <div style={{ flex: 1, borderRadius: '3px', background: passwordStrength ? (passwordStrength === 'Fraca' ? 'var(--danger-color)' : passwordStrength === 'Média' ? 'var(--warning-color)' : 'var(--success-color)') : 'var(--border-color)' }}></div>
                  <div style={{ flex: 1, borderRadius: '3px', background: (passwordStrength === 'Média' || passwordStrength === 'Forte') ? (passwordStrength === 'Média' ? 'var(--warning-color)' : 'var(--success-color)') : 'var(--border-color)' }}></div>
                  <div style={{ flex: 1, borderRadius: '3px', background: passwordStrength === 'Forte' ? 'var(--success-color)' : 'var(--border-color)' }}></div>
                </div>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem', lineHeight: '1.4' }}>
                  Forte: Mínimo 1 letra maiúscula, 1 número e 1 caractere especial.<br />
                  Média: Letras e números.<br />
                  Fraca: Apenas letras ou números (não permitida).
                </p>
              </div>
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
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Termos de Uso</h2>
              <div onScroll={handleScrollTerms} style={{ flex: 1, overflowY: 'auto', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-color)', marginBottom: '1rem', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '1rem' }}>Bem-vindo ao Freelas. Ao criar uma conta e utilizar nossa plataforma, você concorda com os termos abaixo, elaborados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD).</p>

                <h3 style={{ marginBottom: '0.5rem' }}>1. Sobre a Plataforma</h3>
                <p style={{ marginBottom: '1rem' }}>O Freelas é um marketplace que conecta freelancers e contratantes, oferecendo ferramentas de busca, comunicação via chat, formalização de acordos de serviço, avaliação e reputação, e um canal de denúncias para moderação.</p>

                <h3 style={{ marginBottom: '0.5rem' }}>2. Natureza dos Acordos entre as Partes</h3>
                <p style={{ marginBottom: '1rem' }}><strong>O Freelas atua exclusivamente como facilitador da conexão</strong> entre freelancers e contratantes. Os acordos de serviço firmados dentro da plataforma não constituem contrato de prestação de serviços com validade jurídica firmado ou intermediado pelo Freelas, tampouco substituem instrumentos formais (contratos, recibos, notas fiscais) que as partes devam celebrar entre si conforme a legislação aplicável à relação. É de responsabilidade exclusiva de freelancers e contratantes o cumprimento das obrigações fiscais, trabalhistas e contratuais decorrentes do serviço prestado. O Freelas não é parte do acordo firmado entre os usuários e não garante nem se responsabiliza pela execução, qualidade, prazo ou pagamento dos serviços contratados entre eles.</p>

                <h3 style={{ marginBottom: '0.5rem' }}>3. Pagamentos e Assinaturas</h3>
                <p style={{ marginBottom: '1rem' }}>Assinaturas de planos e pagamentos de acordos são processados por meio de um parceiro de pagamento (Stripe). O Freelas não armazena dados completos de cartão de crédito; essas informações são tratadas diretamente pelo processador de pagamentos, conforme os padrões de segurança do setor.</p>

                <h3 style={{ marginBottom: '0.5rem' }}>4. Proteção de Dados Pessoais (LGPD)</h3>
                <p style={{ marginBottom: '0.5rem' }}>Tratamos os dados pessoais fornecidos no cadastro e uso da plataforma (nome, e-mail, telefone, cidade/estado, foto de perfil, banner, biografia, habilidades, certificados, currículo, mensagens de chat, avaliações e demais informações que você opte por compartilhar) para as seguintes finalidades:</p>
                <ul style={{ marginBottom: '1rem', paddingLeft: '1.25rem' }}>
                  <li>Criar e autenticar sua conta;</li>
                  <li>Viabilizar o chat, a formalização de acordos e o processamento de pagamentos;</li>
                  <li>Exibir seu perfil público e seu histórico de avaliação/reputação;</li>
                  <li>Moderar denúncias e garantir a segurança da plataforma;</li>
                  <li>Enviar comunicações relacionadas ao serviço.</li>
                </ul>
                <p style={{ marginBottom: '0.5rem' }}>O tratamento se baseia na execução do contrato firmado com você (art. 7º, V, LGPD) e, quando aplicável, no seu consentimento (art. 7º, I). Utilizamos prestadores de serviço para viabilizar funcionalidades específicas — como processamento de pagamentos (Stripe) e armazenamento de imagens (Cloudinary) —, que têm acesso apenas aos dados estritamente necessários para a função que desempenham. Suas senhas são armazenadas de forma criptografada e nunca são acessíveis em texto puro pela nossa equipe. Mantemos seus dados pelo tempo necessário para cumprir as finalidades acima ou por prazo superior quando exigido por lei.</p>
                <p style={{ marginBottom: '1rem' }}>Nos termos do art. 18 da LGPD, você pode a qualquer momento solicitar confirmação da existência de tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamento com terceiros e revogação do consentimento. Para exercer esses direitos, entre em contato pelos canais de suporte disponíveis na plataforma.</p>

                <h3 style={{ marginBottom: '0.5rem' }}>5. Conduta dos Usuários e Denúncias</h3>
                <p style={{ marginBottom: '1rem' }}>Você se compromete a usar a plataforma apenas para fins lícitos, sem violar direitos de terceiros nem restringir ou prejudicar seu uso por outras pessoas. Comportamentos abusivos, fraudulentos, discriminatórios ou que violem estes termos podem ser denunciados através da nossa ferramenta de moderação integrada e podem resultar em suspensão ou exclusão da conta, a critério da administração da plataforma.</p>

                <h3 style={{ marginBottom: '0.5rem' }}>6. Limitação de Responsabilidade</h3>
                <p style={{ marginBottom: '1rem' }}>O Freelas não garante a veracidade das informações fornecidas pelos usuários, nem se responsabiliza por prejuízos decorrentes de acordos descumpridos, má prestação de serviço ou condutas de terceiros fora do controle da plataforma. O uso da plataforma é por conta e risco do usuário.</p>

                <h3 style={{ marginBottom: '0.5rem' }}>7. Alterações nestes Termos</h3>
                <p style={{ marginBottom: '1rem' }}>Estes termos podem ser atualizados periodicamente para refletir mudanças na plataforma ou na legislação aplicável. Alterações relevantes serão comunicadas pelos meios disponíveis na plataforma.</p>

                <p style={{ fontWeight: 'bold' }}>Ao clicar em "Concordar", você declara que leu, compreendeu e concorda integralmente com os termos acima.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setIsTermsModalOpen(false)}>Cancelar</button>
                <button className="btn dark-text" disabled={!termsScrolled} style={{ opacity: termsScrolled ? 1 : 0.5, cursor: termsScrolled ? 'pointer' : 'not-allowed' }} onClick={() => { setAgreedToTerms(true); setIsTermsModalOpen(false); }}>
                  Concordar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
