import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './state/AuthContext';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import './styles.css';
import './pwa.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </BrowserRouter>
  </React.StrictMode>,
);

