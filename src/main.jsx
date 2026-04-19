import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { RoleProvider } from './context/RoleContext.jsx';

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
