import { useState } from 'react'
import Avatar from '../ui/Avatar.jsx'
import StoryViewer from './StoryViewer.jsx'
import { useApi } from '../../hooks/useApi.js'
import s from './StoriesBar.module.css'

const BG_COLORS = ['#e8c5b8', '#f7e0e2', '#e7eee9', '#f4e7dc', '#e7a6ae', '#81b29a']

export default function StoriesBar({ stories = [], me, onChange }) {
  const { post, cargando } = useApi()
  const [viendo, setViendo] = useState(null)
  const [componiendo, setComponiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [bg, setBg] = useState(BG_COLORS[0])
  const [img, setImg] = useState('')

  // Una burbuja por usuario (su historia más reciente).
  const porUsuario = []
  const vistos = new Set()
  for (const st of stories) {
    if (!vistos.has(st.user.id)) {
      vistos.add(st.user.id)
      porUsuario.push(st)
    }
  }

  const publicar = async () => {
    if (!texto.trim() && !img.trim()) return
    try {
      await post('/api/stories', {
        text: texto.trim() || undefined,
        bgColor: bg,
        imageUrl: img.trim() || undefined,
      })
      setTexto('')
      setImg('')
      setComponiendo(false)
      onChange?.()
    } catch {
      /* hook */
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <button className={s.item} onClick={() => setComponiendo((v) => !v)}>
          <span className={s.addRing}>
            <Avatar user={me} size={58} />
            <span className={s.plus}>+</span>
          </span>
          <span className={s.label}>Tu historia</span>
        </button>

        {porUsuario.map((st) => (
          <button key={st.id} className={s.item} onClick={() => setViendo(st.id)}>
            <Avatar user={st.user} size={62} ring />
            <span className={s.label}>{st.user.username}</span>
          </button>
        ))}
      </div>

      {componiendo && (
        <div className={s.composer}>
          <div className={s.preview} style={{ background: bg }}>
            {img ? <img src={img} alt="vista previa" /> : <span>{texto || 'Tu historia…'}</span>}
          </div>
          <textarea
            placeholder="Escribe tu historia…"
            maxLength={280}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <input
            placeholder="…o pega una URL de imagen (opcional)"
            value={img}
            onChange={(e) => setImg(e.target.value)}
          />
          <div className={s.colors}>
            {BG_COLORS.map((c) => (
              <button
                key={c}
                className={`${s.swatch} ${bg === c ? s.swatchActive : ''}`}
                style={{ background: c }}
                onClick={() => setBg(c)}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
          <div className={s.actions}>
            <button className={s.cancel} onClick={() => setComponiendo(false)}>
              Cancelar
            </button>
            <button className={s.publish} onClick={publicar} disabled={cargando}>
              Publicar
            </button>
          </div>
        </div>
      )}

      {viendo && <StoryViewer storyId={viendo} me={me} onClose={() => setViendo(null)} />}
    </div>
  )
}
