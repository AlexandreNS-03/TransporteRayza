import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './Components/ErrorBoundary.jsx'
import GestorModales from './Components/GestorModales.jsx'
import { escucharErrores } from './Services/errores.js'

// Los errores del navegador llegan a Soporte en vez de quedarse en la consola de
// una máquina del mostrador que nadie mira.
escucharErrores();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Teclado y foco para todos los modales, en un solo lugar */}
      <GestorModales />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
