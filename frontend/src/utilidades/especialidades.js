// Ícono representativo de cada especialidad, buscado por palabras de su nombre.
import { Baby, Bone, Brain, Eye, HeartPulse, Smile, Stethoscope } from 'lucide-react'

const ICONOS = [
  [['pediatr'], Baby],
  [['odonto', 'dental'], Smile],
  [['ginec', 'obstet', 'cardio'], HeartPulse],
  [['neuro', 'psiqu', 'psicol'], Brain],
  [['ortop', 'traumat'], Bone],
  [['oftal', 'optom'], Eye],
]

export function iconoDeEspecialidad(nombre = '') {
  const texto = nombre.toLowerCase()
  const encontrado = ICONOS.find(([claves]) => claves.some((clave) => texto.includes(clave)))
  return encontrado ? encontrado[1] : Stethoscope
}
