import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import 'leaflet/dist/leaflet.css';
import './index.css';

// Force English as default — override any stale Marathi cached in localStorage
const storedLang = localStorage.getItem('Mohra_language');
if (!storedLang || storedLang === 'mr') {
  localStorage.setItem('Mohra_language', 'en');
  localStorage.setItem('i18nextLng', 'en');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
