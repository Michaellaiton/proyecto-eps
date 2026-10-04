import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import Aplicacion from './Aplicacion.jsx'
import './estilos/global.css'

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <Aplicacion />
  </StrictMode>,
)
