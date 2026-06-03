import s from './States.module.css'
import Spinner from './Spinner.jsx'

// Estados compartidos: carga, error y vacío. Reutilizados en todas las páginas (DRY).
export function Cargando({ label = 'Cargando…' }) {
  return (
    <div className={s.center}>
      <Spinner label={label} />
    </div>
  )
}

export function ErrorMsg({ children, onRetry }) {
  return (
    <div className={s.center}>
      <div className={s.emoji}>🥀</div>
      <p className={s.errorText}>{children || 'Ha ocurrido un error'}</p>
      {onRetry && (
        <button className={s.retry} onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Vacio({ emoji = '🌱', titulo, children }) {
  return (
    <div className={s.center}>
      <div className={s.emoji}>{emoji}</div>
      {titulo && <h3 className={s.titulo}>{titulo}</h3>}
      {children && <p className={s.muted}>{children}</p>}
    </div>
  )
}
