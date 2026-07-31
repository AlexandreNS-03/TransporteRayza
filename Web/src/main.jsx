import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { aplicarTemaInicial } from "./components/ThemeToggle";
import { iniciarClarity } from "./services/clarity";
import { iniciarGA } from "./services/ga";
import App from './App.jsx'

aplicarTemaInicial();
iniciarClarity();
iniciarGA();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
