import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/ContextoAutenticacao';
import { useDialogo } from '../context/ContextoDialogo';

export default function Configuracoes() {
  const { token, logout } = useAuth();
  const { alerta } = useDialogo();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const podeExcluir = senha.trim() !== '' && confirmacao === 'EXCLUIR';

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
    if (!senha.trim()) {
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
        body: JSON.stringify({ senha })
      });
      const data = await response.json();
      if (response.ok) {
        logout();
        await alerta('Sua conta foi excluída com sucesso.', { titulo: 'Conta excluída', variante: 'sucesso' });
        navigate('/login');
      } else {
        setErrorMsg(data.error || 'Erro ao excluir a conta. Tente novamente.');
      }
    } catch (err) {
      setErrorMsg('Erro interno de conexão. Tente novamente.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Configurações</h1>

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