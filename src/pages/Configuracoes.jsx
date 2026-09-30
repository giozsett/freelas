import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Briefcase, Building2 } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useRole } from '../context/ContextoPapel';
import { useDialogo } from '../context/ContextoDialogo';

export default function Configuracoes() {
  const { token, logout, user } = useAuth();
  const { role } = useRole();
  const { alerta } = useDialogo();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const temSenha = !!user?.tem_senha;

  const podeExcluir = (temSenha ? senha.trim() !== '' : true) && confirmacao === 'EXCLUIR';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
          {role === 'contractor' ? <Building2 size={22} color="var(--primary)" /> : <Briefcase size={22} color="var(--primary)" />}
          <span style={{ fontWeight: '600' }}>{role === 'contractor' ? 'Contratante' : 'Freelancer'}</span>
        </div>
        <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0, lineHeight: '1.5' }}>
          {role === 'contractor'
            ? 'Você publica vagas, recebe candidaturas de freelancers, contrata e paga pelos serviços.'
            : 'Você se candidata às vagas publicadas por contratantes e recebe pelos serviços prestados.'}
          {' '}O tipo de conta é definido no cadastro e não pode ser alterado.
        </p>
        {role === 'contractor' && (
          <p style={{ fontSize: '0.9rem', margin: '0.75rem 0 0', lineHeight: '1.5' }}>
            Os dados da empresa, os serviços que você contrata e como trabalha com freelancers ficam em{' '}
            <Link to="/profile/edit" style={{ color: 'var(--primary)', fontWeight: 600 }}>Editar perfil</Link>.
          </p>
        )}
        <p style={{ fontSize: '0.9rem', margin: '0.75rem 0 0', lineHeight: '1.5' }}>
          <strong>Situação da conta:</strong> {user?.profile?.pontos_infracao || 0} de 3 pontos de infração.
          <span style={{ opacity: 0.7 }}> Denúncias procedentes e disputas decididas contra você somam pontos; com 3 pontos a conta é banida.</span>
        </p>
      </div>

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