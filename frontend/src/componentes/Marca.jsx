import { Stethoscope } from 'lucide-react'

export default function Marca({ alPulsar }) {
  return (
    <button type="button" className="marca" onClick={alPulsar}>
      <span className="marca__logo">
        <Stethoscope size={20} />
      </span>
      Citas EPS
    </button>
  )
}
