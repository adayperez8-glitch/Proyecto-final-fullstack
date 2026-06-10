import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { persistMedia } from '../../lib/storage.js'
import { friendIdsOf } from '../../lib/friendships.js'
import { publicUser, privateUser, sessionDTO, moodDTO, storyDTO } from '../../utils/serializers.js'

const ONLINE_MIN = 5
const onlineThreshold = () => new Date(Date.now() - ONLINE_MIN * 60 * 1000)
const isOnline = (user) => user.lastSeenAt > onlineThreshold()

// Solicitudes de amistad pendientes entre yo y un conjunto de usuarios:
// las que les envié (toId → id) y las que me enviaron (fromId → id).
async function requestStateFor(meId, ids) {
  if (!ids.length) return { enviadas: new Map(), recibidas: new Map() }
  const [sent, received] = await Promise.all([
    prisma.friendRequest.findMany({ where: { fromId: meId, toId: { in: ids } } }),
    prisma.friendRequest.findMany({ where: { toId: meId, fromId: { in: ids } } }),
  ])
  return {
    enviadas: new Map(sent.map((r) => [r.toId, r.id])),
    recibidas: new Map(received.map((r) => [r.fromId, r.id])),
  }
}

// Campos de relación que el frontend necesita para pintar el botón de amistad.
const relationFields = (u, friendSet, reqs) => ({
  esAmigo: friendSet.has(u.id),
  solicitudEnviada: reqs.enviadas.has(u.id),
  solicitudRecibida: reqs.recibidas.has(u.id),
  solicitudId: reqs.recibidas.get(u.id) || reqs.enviadas.get(u.id) || null,
})

// Lista de usuarios. Admin ve además email y fecha de alta.
export async function list(req, res) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  const usuarios = users.map((u) => ({
    ...publicUser(u),
    online: isOnline(u),
    ...(req.user.role === 'ADMIN' ? { email: u.email, createdAt: u.createdAt } : {}),
  }))
  res.json({ usuarios })
}

// Usuarios conectados ahora mismo (presencia).
export async function online(_req, res) {
  const users = await prisma.user.findMany({
    where: { lastSeenAt: { gt: onlineThreshold() } },
    orderBy: { lastSeenAt: 'desc' },
  })
  res.json({ usuarios: users.map((u) => ({ ...publicUser(u), online: true })) })
}

// Búsqueda de usuarios por nombre o @usuario, con nº de amigos en común.
export async function search(req, res) {
  const q = (req.query.q || '').trim()
  if (!q) return res.json({ usuarios: [] })

  const found = await prisma.user.findMany({
    where: {
      id: { not: req.user.id },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { displayName: 'asc' },
    take: 20,
  })

  const friendIds = await friendIdsOf(req.user.id)
  const friendSet = new Set(friendIds)
  const ids = found.map((u) => u.id)
  const reqs = await requestStateFor(req.user.id, ids)

  // Amigos en común de cada resultado = amigos suyos que también son míos.
  const mutual =
    ids.length && friendIds.length
      ? await prisma.friendship.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, friendId: { in: friendIds } },
          _count: { friendId: true },
        })
      : []
  const mutualByUser = new Map(mutual.map((m) => [m.userId, m._count.friendId]))

  res.json({
    usuarios: found.map((u) => ({
      ...publicUser(u),
      online: isOnline(u),
      ...relationFields(u, friendSet, reqs),
      amigosEnComun: mutualByUser.get(u.id) || 0,
    })),
  })
}

// Recomendaciones: amigos de tus amigos, ordenados por amigos en común (desc).
export async function recommendations(req, res) {
  const friendIds = await friendIdsOf(req.user.id)
  const friendSet = new Set(friendIds)
  let recs = []

  if (friendIds.length) {
    const grouped = await prisma.friendship.groupBy({
      by: ['friendId'],
      where: { userId: { in: friendIds }, friendId: { notIn: [req.user.id, ...friendIds] } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 12,
    })
    const ids = grouped.map((g) => g.friendId)
    if (ids.length) {
      const [users, reqs] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: ids } } }),
        requestStateFor(req.user.id, ids),
      ])
      const byId = new Map(users.map((u) => [u.id, u]))
      recs = grouped
        .map((g) => {
          const u = byId.get(g.friendId)
          return u
            ? {
                ...publicUser(u),
                online: isOnline(u),
                ...relationFields(u, friendSet, reqs),
                amigosEnComun: g._count.userId,
              }
            : null
        })
        .filter(Boolean)
    }
  }

  // Si aún no tienes amigos, sugerimos caras nuevas de la comunidad.
  if (recs.length === 0) {
    const recientes = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    const nuevos = recientes.filter((u) => !friendSet.has(u.id))
    const reqs = await requestStateFor(req.user.id, nuevos.map((u) => u.id))
    recs = nuevos.map((u) => ({
      ...publicUser(u),
      online: isOnline(u),
      ...relationFields(u, friendSet, reqs),
      amigosEnComun: 0,
    }))
  }

  res.json({ usuarios: recs })
}

// Perfil público. La sesión activa, el ánimo y las historias siguen la misma
// regla de privacidad que el feed: solo las ven los amigos (o el propio dueño).
export async function profile(req, res) {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } })
  if (!user) throw ApiError.notFound('Usuario no encontrado')

  const myIds = await friendIdsOf(req.user.id)
  const esAmigo = myIds.includes(user.id)
  const esMio = user.id === req.user.id
  const puedeVer = esAmigo || esMio

  const [session, mood, stories, numAmigos, comunes, reqs] = await Promise.all([
    puedeVer
      ? prisma.focusSession.findFirst({ where: { userId: user.id, status: 'ACTIVE' } })
      : null,
    puedeVer
      ? prisma.mood.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
      : null,
    puedeVer
      ? prisma.story.findMany({
          where: { userId: user.id, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        })
      : [],
    prisma.friendship.count({ where: { userId: user.id } }),
    myIds.length
      ? prisma.friendship.count({ where: { userId: user.id, friendId: { in: myIds } } })
      : Promise.resolve(0),
    requestStateFor(req.user.id, esMio ? [] : [user.id]),
  ])

  res.json({
    perfil: {
      ...publicUser(user),
      online: isOnline(user),
      ...relationFields(user, new Set(myIds), reqs),
      numAmigos,
      amigosEnComun: comunes,
      // true cuando el contenido está oculto por no ser amigos (para que el
      // frontend explique el porqué en vez de mostrar un perfil "vacío").
      privado: !puedeVer,
      sesionActiva: session ? sessionDTO({ ...session, user }) : null,
      mood: mood ? moodDTO({ ...mood, user }) : null,
      historias: stories.map((s) => storyDTO({ ...s, user })),
    },
  })
}

export async function updateMe(req, res) {
  const updated = await prisma.user.update({ where: { id: req.user.id }, data: req.body })
  res.json({ usuario: privateUser(updated) })
}

// Sube una imagen (desde la galería) y devuelve su URL pública para usarla como
// avatar. El cliente luego la guarda con PATCH /api/users/me.
export async function uploadAvatar(req, res) {
  if (!req.file) throw ApiError.badRequest('No se recibió ninguna imagen')
  if (!req.file.mimetype.startsWith('image/')) {
    throw ApiError.badRequest('El avatar debe ser una imagen')
  }
  const { url } = await persistMedia(req.file, req)
  res.status(201).json({ url })
}

// ── Acciones de administrador ──────────────────────────────────
export async function removeUser(req, res) {
  if (req.params.id === req.user.id) throw ApiError.badRequest('No puedes eliminarte a ti mismo')
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

export async function setRole(req, res) {
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role },
  })
  res.json({ usuario: publicUser(updated) })
}
