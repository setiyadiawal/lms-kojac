import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './state/AuthContext';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import './styles.css';
import './pwa.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
      <PWAInstallPrompt />
    </BrowserRouter>
  </React.StrictMode>,
);


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) => {
        console.error('KOJAC service worker registration failed', error);
      });
  });
}
