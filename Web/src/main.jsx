import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { aplicarTemaInicial } from "./components/ThemeToggle";
import { iniciarAnalitica } from "./services/analitica";
import { consentActual } from "./services/consent";
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { escucharErrores } from './services/errores'

aplicarTemaInicial();
// Los errores del navegador llegan a Soporte: antes, el cliente que se topaba con
// una pantalla rota simplemente se iba y nadie se enteraba.
escucharErrores();
// La analítica solo se enciende si el visitante ya aceptó las cookies antes.
if (consentActual() === "accepted") iniciarAnalitica();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
