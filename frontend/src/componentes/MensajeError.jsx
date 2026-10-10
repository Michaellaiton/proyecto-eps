import { CircleAlert } from 'lucide-react'

export default function MensajeError({ error }) {
  if (!error) return null
  return (
    <p className="mensaje mensaje--error" role="alert">
      <CircleAlert size={18} />
      {error.message}
    </p>
  )
}
