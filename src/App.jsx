import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BarraNavegacao from './components/BarraNavegacao';
import Inicio from './pages/Inicio';
import Perfil from './pages/Perfil';
import CriarAnuncio from './pages/CriarAnuncio';
import EditarAnuncio from './pages/EditarAnuncio';
import DetalhesAnuncio from './pages/DetalhesAnuncio';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Conversa from './pages/Conversa';
import EditarPerfil from './pages/EditarPerfil';
import Planos from './pages/Planos';
import MeusAnuncios from './pages/MeusAnuncios';
import MinhasCandidaturas from './pages/MinhasCandidaturas';
import PerfilPublico from './pages/PerfilPublico';
import GerenciarCandidaturas from './pages/GerenciarCandidaturas';
import RotaPrivada from './components/RotaPrivada';
import Rodape from './components/Rodape';
import LoginModerador from './pages/LoginModerador';
import PainelModeracao from './pages/PainelModeracao';
import ConfigurarAssinatura from './pages/ConfigurarAssinatura';
import MeusPagamentos from './pages/MeusPagamentos';
import EsqueciSenha from './pages/EsqueciSenha';
import MeusFreelas from './pages/MeusFreelas';
import MinhasAvaliacoes from './pages/MinhasAvaliacoes';
import { ProvedorDialogo } from './context/ContextoDialogo';

function App() {
  return (
    <ProvedorDialogo>
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <BarraNavegacao />
        <div className="container" style={{ marginTop: '2rem', marginBottom: '4rem', flex: 1, width: '100%' }}>
        <Routes>
          <Route path="/" element={<RotaPrivada><Inicio /></RotaPrivada>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Cadastro />} />
          <Route path="/profile" element={<RotaPrivada><Perfil /></RotaPrivada>} />
          <Route path="/profile/edit" element={<RotaPrivada><EditarPerfil /></RotaPrivada>} />
          <Route path="/create-ad" element={<RotaPrivada><CriarAnuncio /></RotaPrivada>} />
          <Route path="/edit-ad/:id" element={<RotaPrivada><EditarAnuncio /></RotaPrivada>} />
          <Route path="/ad/:id" element={<RotaPrivada><DetalhesAnuncio /></RotaPrivada>} />
          <Route path="/chat" element={<RotaPrivada><Conversa /></RotaPrivada>} />
          <Route path="/chat/:acordoId" element={<RotaPrivada><Conversa /></RotaPrivada>} />
          <Route path="/plans" element={<RotaPrivada><Planos /></RotaPrivada>} />
          <Route path="/my-ads" element={<RotaPrivada><MeusAnuncios /></RotaPrivada>} />
          <Route path="/my-ads/manage/:id" element={<RotaPrivada><GerenciarCandidaturas /></RotaPrivada>} />
          <Route path="/my-applications" element={<RotaPrivada><MinhasCandidaturas /></RotaPrivada>} />
          <Route path="/user/:id" element={<RotaPrivada><PerfilPublico /></RotaPrivada>} />
          <Route path="/moderator-login" element={<LoginModerador />} />
          <Route path="/moderation-panel" element={<PainelModeracao />} />
          <Route path="/subscription-setup" element={<RotaPrivada><ConfigurarAssinatura /></RotaPrivada>} />
          <Route path="/my-payments" element={<RotaPrivada><MeusPagamentos /></RotaPrivada>} />
          <Route path="/my-freelas" element={<RotaPrivada><MeusFreelas /></RotaPrivada>} />
          <Route path="/my-reviews" element={<RotaPrivada><MinhasAvaliacoes /></RotaPrivada>} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        </Routes>
      </div>
      <Rodape />
      </div>
    </Router>
    </ProvedorDialogo>
  );
}

export default App;
