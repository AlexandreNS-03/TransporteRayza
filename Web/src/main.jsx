import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { aplicarTemaInicial } from "./components/ThemeToggle";
import { iniciarClarity } from "./services/clarity";
import App from './App.jsx'

aplicarTemaInicial();
iniciarClarity();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
