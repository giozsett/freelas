import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ContextoTema.jsx';
import { AuthProvider } from './context/ContextoAutenticacao.jsx';
import { RoleProvider } from './context/ContextoPapel.jsx';
import { NotificacaoProvider } from './context/ContextoNotificacao.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RoleProvider>
        <ThemeProvider>
          <NotificacaoProvider>
            <App />
          </NotificacaoProvider>
        </ThemeProvider>
      </RoleProvider>
    </AuthProvider>
  </React.StrictMode>,
);
