import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { aplicarTemaInicial } from "./components/ThemeToggle";
import { iniciarAnalitica } from "./services/analitica";
import { consentActual } from "./services/consent";
import App from './App.jsx'

aplicarTemaInicial();
// La analítica solo se enciende si el visitante ya aceptó las cookies antes.
if (consentActual() === "accepted") iniciarAnalitica();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
