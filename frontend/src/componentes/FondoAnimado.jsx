// Fondo con manchas de color en movimiento lento (se detiene si el usuario prefiere menos movimiento).
export default function FondoAnimado() {
  return (
    <div className="fondo-animado" aria-hidden="true">
      <span className="fondo-animado__mancha" />
      <span className="fondo-animado__mancha" />
      <span className="fondo-animado__mancha" />
    </div>
  )
}
