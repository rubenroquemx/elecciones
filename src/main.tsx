import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Registro de Service Worker para habilitar instalación PWA "Vertex" y auto-actualización
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch((err) => {
      console.warn('Error al registrar Service Worker PWA:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Desvanecer el splash screen estático de inicio de forma suave
const staticSplash = document.getElementById('static-splash');
if (staticSplash) {
  setTimeout(() => {
    staticSplash.classList.add('hidden-splash');
    setTimeout(() => staticSplash.remove(), 450);
  }, 250);
}
