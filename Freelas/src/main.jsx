import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ContextoTema.jsx';
import { AuthProvider } from './context/ContextoAutenticacao.jsx';
import { RoleProvider } from './context/ContextoPapel.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RoleProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </RoleProvider>
    </AuthProvider>
  </React.StrictMode>,
);
