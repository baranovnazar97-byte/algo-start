import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import './styles/global.css';
import './styles/material.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
