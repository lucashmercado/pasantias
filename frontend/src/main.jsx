/**
 * main.jsx — Punto de entrada principal de la aplicación React.
 *
 * Se encarga de:
 * - Importar los estilos globales (variables CSS y reset)
 * - Montar el componente raíz App dentro del elemento HTML con id="root"
 * - Envolver la app con StrictMode para detectar problemas en desarrollo
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'   // Importa las variables CSS y estilos globales
import App from './App.jsx'

// Monta la aplicación React en el elemento #root del index.html
createRoot(document.getElementById('root')).render(
  // StrictMode activa advertencias adicionales en desarrollo (no afecta producción)
  <StrictMode>
    <App />
  </StrictMode>,
)
