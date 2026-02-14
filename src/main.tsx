import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './config/aws-config.ts';
import App from './App.tsx';

if (typeof global === 'undefined' && typeof window !== 'undefined') {
  (window as any).global = window;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
