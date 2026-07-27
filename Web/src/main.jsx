import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { aplicarTemaInicial } from "./components/ThemeToggle";
import App from './App.jsx'

aplicarTemaInicial();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
