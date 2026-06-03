import s from './Spinner.module.css'

export default function Spinner({ label }) {
  return (
    <div className={s.wrap} role="status" aria-live="polite">
      <span className={s.dots}>
        <i />
        <i />
        <i />
      </span>
      {label && <span className={s.label}>{label}</span>}
    </div>
  )
}
