import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { hydrateUiThemeFromStorage } from '@/lib/applyUiTheme';
import '@/styles/globals.css';

hydrateUiThemeFromStorage();

const root = document.getElementById('root');

if (!root) {
  throw new Error('Élément #root introuvable.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
