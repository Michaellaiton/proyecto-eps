import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import Aplicacion from './Aplicacion.jsx'
import './estilos/variables.css'
import './estilos/base.css'
import './estilos/componentes.css'
import './estilos/paginas.css'

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <Aplicacion />
  </StrictMode>,
)
