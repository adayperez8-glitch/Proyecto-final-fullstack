import { useRef, useState } from 'react'
import Avatar from '../ui/Avatar.jsx'
import StoryViewer from './StoryViewer.jsx'
import { useApi } from '../../hooks/useApi.js'
import s from './StoriesBar.module.css'

const BG_COLORS = ['#e8c5b8', '#f7e0e2', '#e7eee9', '#f4e7dc', '#e7a6ae', '#81b29a']

export default function StoriesBar({ stories = [], me, onChange }) {
  const { post, upload, cargando } = useApi()
  const fileRef = useRef(null)
  const [viendo, setViendo] = useState(null)
  const [componiendo, setComponiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [bg, setBg] = useState(BG_COLORS[0])
  const [img, setImg] = useState('')
  const [mediaType, setMediaType] = useState('IMAGE')
  const [subiendo, setSubiendo] = useState(false)
  const [errorSubida, setErrorSubida] = useState('')

  // Una burbuja por usuario (su historia más reciente).
  const porUsuario = []
  const vistos = new Set()
  for (const st of stories) {
    if (!vistos.has(st.user.id)) {
      vistos.add(st.user.id)
      porUsuario.push(st)
    }
  }

  // Sube la foto/vídeo elegido en la galería y guarda su URL pública + tipo.
  const elegirArchivo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reelegir el mismo archivo
    if (!file) return
    setErrorSubida('')
    setSubiendo(true)
    try {
      const { url, mediaType: tipo } = await upload('/api/stories/upload', file)
      setImg(url)
      setMediaType(tipo)
    } catch (err) {
      setErrorSubida(err.message || 'No se pudo subir el archivo')
    } finally {
      setSubiendo(false)
    }
  }

  const quitarMedia = () => {
    setImg('')
    setMediaType('IMAGE')
  }

  const publicar = async () => {
    if (!texto.trim() && !img.trim()) return
    try {
      await post('/api/stories', {
        text: texto.trim() || undefined,
        bgColor: bg,
        imageUrl: img.trim() || undefined,
        mediaType: img.trim() ? mediaType : undefined,
      })
      setTexto('')
      setImg('')
      setMediaType('IMAGE')
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
            {img ? (
              mediaType === 'VIDEO' ? (
                <video src={img} controls playsInline />
              ) : (
                <img src={img} alt="vista previa" />
              )
            ) : (
              <span>{texto || 'Tu historia…'}</span>
            )}
          </div>
          <textarea
            placeholder="Escribe tu historia…"
            maxLength={280}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={elegirArchivo}
          />
          <div className={s.mediaRow}>
            <button
              type="button"
              className={s.galeria}
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
            >
              {subiendo ? 'Subiendo…' : img ? '🔄 Cambiar foto/vídeo' : '🖼️ Subir de la galería'}
            </button>
            {img && (
              <button type="button" className={s.quitar} onClick={quitarMedia}>
                Quitar
              </button>
            )}
          </div>
          {errorSubida && <p className={s.errorSubida}>{errorSubida}</p>}
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
            <button className={s.publish} onClick={publicar} disabled={cargando || subiendo}>
              Publicar
            </button>
          </div>
        </div>
      )}

      {viendo && <StoryViewer storyId={viendo} me={me} onClose={() => setViendo(null)} />}
    </div>
  )
}
