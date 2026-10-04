export default function MensajeError({ error }) {
  if (!error) return null
  return (
    <p className="mensaje mensaje--error" role="alert">
      {error.estado ? `${error.estado} · ` : ''}
      {error.message}
    </p>
  )
}
