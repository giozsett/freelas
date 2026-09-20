import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Briefcase, Building2, UserRound } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useDialogo } from '../context/ContextoDialogo';

export default function Configuracoes() {
  const { token, logout, user, ajustarPapel } = useAuth();
  const { role } = useRole();
  const { alerta } = useDialogo();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [termoPapel, setTermoPapel] = useState(null); // 'empresa' | 'freelancer' | null (fechado)
  const [aceitouTermo, setAceitouTermo] = useState(false);
  const [tipoEmpresa, setTipoEmpresa] = useState(user?.profile?.tipo_empresa === 'cnpj' ? 'cnpj' : 'pessoa');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [salvandoPapel, setSalvandoPapel] = useState(false);
  const [erroPapel, setErroPapel] = useState('');
  const [dadosEmpresa, setDadosEmpresa] = useState(() => ({
    nome_empresa: user?.profile?.nome_empresa || '',
    ramo_empresa: user?.profile?.ramo_empresa || '',
    porte_empresa: user?.profile?.porte_empresa || '',
    cnpj: user?.profile?.cnpj || '',
    site_empresa: user?.profile?.site_empresa || '',
    bio_empresa: user?.profile?.bio_empresa || '',
  }));
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [sucessoEmpresa, setSucessoEmpresa] = useState(false);

  const atualizarEmpresa = (campo) => (e) => {
    setDadosEmpresa(prev => ({ ...prev, [campo]: e.target.value }));
    setSucessoEmpresa(false);
  };

  const salvarDadosEmpresa = async () => {
    setSalvandoEmpresa(true);
    setErroEmpresa('');
    setSucessoEmpresa(false);
    try {
      const response = await fetch('http://localhost:8000/api/auth/profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(dadosEmpresa)
      });
      if (!response.ok) throw new Error('Não foi possível salvar os dados da empresa.');
      await alerta('Dados da empresa atualizados com sucesso.', { titulo: 'Empresa atualizada', variante: 'sucesso' });
      setSucessoEmpresa(true);
    } catch (err) {
      setErroEmpresa(err.message || 'Erro ao salvar os dados da empresa.');
    } finally {
      setSalvandoEmpresa(false);
    }
  };

  const temSenha = !!user?.tem_senha;

  const podeExcluir = (temSenha ? senha.trim() !== '' : true) && confirmacao === 'EXCLUIR';

  const papelAtual = user?.profile?.papel === 'empresa' ? 'empresa' : user?.profile?.papel === 'freelancer' ? 'freelancer' : null;

  const handleMudarPapel = async (novoPapel) => {
    if (!novoPapel || novoPapel === papelAtual || salvandoPapel) return;
    // Virar empresa exige criação do perfil de contratante (pessoa física ou CNPJ)
    if (novoPapel === 'empresa' && !user?.profile?.tipo_empresa) {
      navigate('/criar-perfil-empresa');
      return;
    }
    // Toda mudança de papel exige aceitar o termo correspondente
    setErroPapel('');
    setAceitouTermo(false);
    setTipoEmpresa(user?.profile?.tipo_empresa === 'cnpj' ? 'cnpj' : 'pessoa');
    setTermoPapel(novoPapel);
  };

  const executarMudarPapel = async (novoPapel) => {
    setSalvandoPapel(true);
    setErroPapel('');
    try {
      const payload = novoPapel === 'empresa'
        ? { papel: novoPapel, tipo_empresa: tipoEmpresa, aceitou_termos_empresa: true }
        : { papel: novoPapel, aceitou_termos_freelancer: true };
      const response = await fetch('http://localhost:8000/api/auth/profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Não foi possível alterar o tipo de conta.');
      ajustarPapel(novoPapel);
      setTermoPapel(null);
      await alerta(
        `Seu tipo de conta agora é ${novoPapel === 'empresa' ? 'Empresa/Contratante' : 'Freelancer'}.`,
        { titulo: 'Tipo de conta atualizado', variante: 'sucesso' }
      );
    } catch (err) {
      setErroPapel(err.message || 'Erro ao alterar o tipo de conta.');
      setTermoPapel(null);
    } finally {
      setSalvandoPapel(false);
    }
  };

  const confirmarTermo = async () => {
    if (!aceitouTermo) {
      setErroPapel(
        `Você precisa aceitar o termo para mudar a conta para ${termoPapel === 'empresa' ? 'Empresa/Contratante' : 'Freelancer'}.`
      );
      return;
    }
    // Quem escolhe CNPJ mas ainda não preencheu os dados da empresa finaliza no onboarding
    if (termoPapel === 'empresa' && tipoEmpresa === 'cnpj' && !user?.profile?.nome_empresa) {
      setTermoPapel(null);
      setErroPapel('');
      navigate('/criar-perfil-empresa');
      return;
    }
    await executarMudarPapel(termoPapel);
  };

  const abrirModal = () => {
    setSenha('');
    setConfirmacao('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setSenha('');
    setConfirmacao('');
    setErrorMsg('');
  };

  const handleExcluirConta = async () => {
    if (temSenha && !senha.trim()) {
      setErrorMsg('Digite sua senha atual para confirmar.');
      return;
    }
    if (confirmacao !== 'EXCLUIR') {
      setErrorMsg('Digite EXCLUIR para confirmar a exclusão.');
      return;
    }
    setErrorMsg('');
    setExcluindo(true);
    try {
      const response = await fetch('http://localhost:8000/api/auth/excluir-conta/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(temSenha ? { senha } : {})
      });
      const data = await response.json();
      if (response.ok) {
        logout();
        await alerta('Sua conta foi excluída com sucesso.', { titulo: 'Conta excluída', variante: 'sucesso' });
        navigate('/login');
      } else {
        setErrorMsg(data.error || 'Erro ao excluir a conta. Tente novamente.');
      }
    } catch {
      setErrorMsg('Erro interno de conexão. Tente novamente.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Configurações</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Tipo de conta</h2>
        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Você atua como freelancer (oferece serviços) ou como empresa/contratante (contrata freelancers).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <button
            type="button"
            className="card"
            disabled={salvandoPapel}
            onClick={() => handleMudarPapel('freelancer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              background: papelAtual === 'freelancer' ? 'var(--secondary)' : 'var(--surface-color)',
              border: papelAtual === 'freelancer' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            }}
          >
            <Briefcase size={22} color="var(--primary)" />
            <span style={{ fontWeight: '600' }}>Freelancer</span>
            {role === 'freelancer' && <span className="badge" style={{ marginLeft: 'auto' }}>Atual</span>}
          </button>
          <button
            type="button"
            className="card"
            disabled={salvandoPapel}
            onClick={() => handleMudarPapel('empresa')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              background: papelAtual === 'empresa' ? 'var(--secondary)' : 'var(--surface-color)',
              border: papelAtual === 'empresa' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            }}
          >
            <Building2 size={22} color="var(--primary)" />
            <span style={{ fontWeight: '600' }}>Empresa/Contratante</span>
            {role === 'contractor' && <span className="badge" style={{ marginLeft: 'auto' }}>Atual</span>}
          </button>
        </div>
        {role === 'contractor' && (
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '1rem' }}>
            Como Empresa/Contratante você publica anúncios, recebe propostas e contrata freelancers. A aba &ldquo;Minhas candidaturas&rdquo; fica disponível apenas para freelancers.
          </p>
        )}
        {erroPapel && (
          <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginTop: '1rem' }}>{erroPapel}</p>
        )}
      </div>

      {role === 'contractor' && user?.profile?.tipo_empresa === 'cnpj' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Dados da empresa</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Estes dados compõem o perfil de contratante exibido quando sua conta atua como Empresa.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Nome da empresa *</label>
              <input className="input" style={{ width: '100%' }} value={dadosEmpresa.nome_empresa} onChange={atualizarEmpresa('nome_empresa')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Ramo / segmento *</label>
              <input className="input" style={{ width: '100%' }} value={dadosEmpresa.ramo_empresa} onChange={atualizarEmpresa('ramo_empresa')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Porte</label>
              <select className="input" style={{ width: '100%' }} value={dadosEmpresa.porte_empresa} onChange={atualizarEmpresa('porte_empresa')}>
                <option value="">Selecione...</option>
                <option value="autonomo">Autônomo</option>
                <option value="micro">Micro (até 9 funcionários)</option>
                <option value="pequena">Pequena (10 a 49)</option>
                <option value="media">Média (50 a 249)</option>
                <option value="grande">Grande (250+)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>CNPJ (opcional)</label>
              <input className="input" style={{ width: '100%' }} value={dadosEmpresa.cnpj} onChange={atualizarEmpresa('cnpj')} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Site (opcional)</label>
              <input className="input" style={{ width: '100%' }} value={dadosEmpresa.site_empresa} onChange={atualizarEmpresa('site_empresa')} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', fontSize: '0.9rem' }}>O que a empresa faz *</label>
              <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical' }} value={dadosEmpresa.bio_empresa} onChange={atualizarEmpresa('bio_empresa')} />
            </div>
          </div>
          {sucessoEmpresa && <p style={{ color: 'var(--success-color)', fontSize: '0.9rem', marginTop: '1rem' }}>Dados salvos.</p>}
          {erroEmpresa && <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginTop: '1rem' }}>{erroEmpresa}</p>}
          <button type="button" className="btn" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={salvandoEmpresa} onClick={salvarDadosEmpresa}>
            <Building2 size={16} />
            {salvandoEmpresa ? 'Salvando...' : 'Salvar dados da empresa'}
          </button>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Privacidade e Dados</h2>
        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Gerencie suas informações pessoais e os dados da sua conta.
        </p>
        <button
          type="button"
          className="btn"
          style={{ background: 'var(--danger-color)', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={abrirModal}
        >
          <Trash2 size={16} />
          Excluir minha conta
        </button>
      </div>

      {termoPapel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              {termoPapel === 'empresa' ? <Building2 size={24} color="var(--primary)" /> : <Briefcase size={24} color="var(--primary)" />}
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                {termoPapel === 'empresa' ? 'Mudar para Empresa / Contratante' : 'Mudar para Freelancer'}
              </h2>
            </div>

            <div style={{ background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', fontSize: '0.9rem', overflowY: 'auto' }}>
              {termoPapel === 'empresa' ? (
                <>
                  <strong style={{ display: 'block', marginBottom: '0.6rem' }}>
                    Como funciona a conta Empresa/Contratante
                  </strong>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', lineHeight: '1.5' }}>
                    <li>
                      Ao mudar sua conta para <strong>Empresa</strong>, você passa a atuar como <strong>Contratante</strong> no Freelas: pode publicar anúncios em busca de um serviço, receber propostas de freelancers e contratar o profissional escolhido.
                    </li>
                    <li>
                      A conta de Empresa serve tanto para <strong>pessoa física</strong> (sem CNPJ, usando o seu próprio perfil) quanto para <strong>empresas com CNPJ</strong> (usando o perfil da organização).
                    </li>
                    <li>
                      Ao contratar serviços, este perfil firma acordos como contratante, com as obrigações legais, fiscais e de responsabilidade previstas nos Termos de Uso gerais da plataforma.
                    </li>
                    <li>
                      Você pode voltar a atuar como freelancer a qualquer momento — seu perfil pessoal permanece o mesmo.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <strong style={{ display: 'block', marginBottom: '0.6rem' }}>
                    Como funciona a conta Freelancer
                  </strong>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', lineHeight: '1.5' }}>
                    <li>
                      Ao atuar como <strong>Freelancer</strong>, você oferece seus serviços na plataforma: publica anúncios oferecendo seu trabalho, se candidata aos anúncios dos contratantes, recebe propostas e firma acordos de serviço com quem contratar.
                    </li>
                    <li>
                      A aba <strong>&ldquo;Minhas candidaturas&rdquo;</strong> fica disponível para você acompanhar e gerenciar suas candidaturas.
                    </li>
                    <li>
                      Ao prestar um serviço, este perfil firma acordos como freelancer, com as obrigações legais, fiscais e de responsabilidade previstas nos Termos de Uso gerais da plataforma.
                    </li>
                    <li>
                      Você pode mudar para <strong>Empresa/Contratante</strong> a qualquer momento, quando quiser.
                    </li>
                  </ol>
                </>
              )}
            </div>

            {termoPapel === 'empresa' && (
              <div style={{ marginTop: '1.25rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Como você vai atuar como contratante?
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setTipoEmpresa('pessoa')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: tipoEmpresa === 'pessoa' ? 'var(--secondary)' : 'var(--surface-color)',
                      border: tipoEmpresa === 'pessoa' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    }}
                  >
                    <UserRound size={18} color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Pessoa física</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEmpresa('cnpj')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: tipoEmpresa === 'cnpj' ? 'var(--secondary)' : 'var(--surface-color)',
                      border: tipoEmpresa === 'cnpj' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    }}
                  >
                    <Building2 size={18} color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Empresa (CNPJ)</span>
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0.5rem 0 0', lineHeight: '1.4' }}>
                  {tipoEmpresa === 'pessoa'
                    ? 'Sem CNPJ, usando o seu próprio perfil para contratar serviços.'
                    : user?.profile?.nome_empresa
                      ? 'Usando o perfil da sua empresa registrada.'
                      : 'CNPJ — você será direcionado para preencher os dados da empresa.'}
                </p>
              </div>
            )}

            <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={aceitouTermo} onChange={(e) => setAceitouTermo(e.target.checked)} style={{ marginTop: '0.15rem' }} />
              <span>
                Li e concordo com o termo acima e confirmo a mudança da minha conta para <strong>{termoPapel === 'empresa' ? 'Empresa/Contratante' : 'Freelancer'}</strong>.
              </span>
            </label>

            {erroPapel && (
              <p style={{ color: 'var(--danger-color)', fontSize: '0.9rem', marginTop: '0.75rem' }}>{erroPapel}</p>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => { setTermoPapel(null); setErroPapel(''); }} disabled={salvandoPapel}>
                Cancelar
              </button>
              <button
                className="btn"
                disabled={!aceitouTermo || salvandoPapel}
                style={{ opacity: aceitouTermo && !salvandoPapel ? 1 : 0.5, cursor: aceitouTermo && !salvandoPapel ? 'pointer' : 'not-allowed' }}
                onClick={confirmarTermo}
              >
                {salvandoPapel ? 'Alterando...' : `Confirmar e virar ${termoPapel === 'empresa' ? 'Empresa' : 'Freelancer'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="var(--danger-color)" />
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--danger-color)' }}>Excluir minha conta</h2>
            </div>

            <p style={{ fontSize: '0.95rem', opacity: 0.8, marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Esta ação é permanente e não pode ser desfeita. Todos os seus anúncios, candidaturas, avaliações e mensagens serão removidos.
            </p>

            {errorMsg && (
              <div className="form-error" style={{ color: 'var(--danger-color)', background: 'var(--danger-soft)', border: '1px solid var(--danger-color)', borderRadius: '4px', padding: '0.8rem', marginBottom: '1.25rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {temSenha ? (
                <div>
                  <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Senha atual</label>
                  <input
                    type="password"
                    className="input"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>
              ) : (
                <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.5', margin: 0 }}>
                  Como você entrou com o Google, LinkedIn, não precisa de senha. Apenas digite{' '}
                  <strong>EXCLUIR</strong> abaixo para confirmar.
                </p>
              )}
              <div>
                <label style={{ fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>
                  Digite <strong>EXCLUIR</strong> para confirmar
                </label>
                <input
                  type="text"
                  className="input"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="EXCLUIR"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button
                className="btn"
                disabled={!podeExcluir || excluindo}
                style={{ background: 'var(--danger-color)', color: '#FFFFFF', border: 'none', opacity: podeExcluir && !excluindo ? 1 : 0.5, cursor: podeExcluir && !excluindo ? 'pointer' : 'not-allowed' }}
                onClick={handleExcluirConta}
              >
                {excluindo ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}