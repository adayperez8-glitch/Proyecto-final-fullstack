import s from './Avatar.module.css'

const palette = ['#E7A6AE', '#81B29A', '#E9A66B', '#C8A98F', '#D98A9A', '#7A5240']

function colorFor(str = '') {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

export default function Avatar({ user, size = 44, ring = false }) {
  const name = user?.displayName || user?.username || '?'
  const initials = name.trim().charAt(0).toUpperCase()
  const dim = { width: size, height: size, fontSize: size * 0.42 }
  const cls = ring ? `${s.avatar} ${s.ring}` : s.avatar

  if (user?.avatarUrl) {
    return <img className={cls} src={user.avatarUrl} alt={name} style={dim} />
  }
  return (
    <span className={cls} style={{ ...dim, background: colorFor(name) }} aria-label={name}>
      {initials}
    </span>
  )
}
