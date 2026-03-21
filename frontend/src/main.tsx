import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import './assets/scss/main.scss';
import App from './App.jsx';

// Apply saved theme before render to prevent FOUC
// Dark is default; 'light' class enables light mode
const savedTheme = localStorage.getItem('knowai-theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.classList.add('light');
} else {
  document.documentElement.classList.remove('light');
}
// Legacy support: also set data-theme for any remaining old styles
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
