import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { publicUser, privateUser, sessionDTO, moodDTO, storyDTO } from '../../utils/serializers.js'

const ONLINE_MIN = 5
const onlineThreshold = () => new Date(Date.now() - ONLINE_MIN * 60 * 1000)
const isOnline = (user) => user.lastSeenAt > onlineThreshold()

// IDs de los amigos de un usuario.
async function myFriendIds(userId) {
  const rows = await prisma.friendship.findMany({ where: { userId }, select: { friendId: true } })
  return rows.map((r) => r.friendId)
}

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

  const friendIds = await myFriendIds(req.user.id)
  const friendSet = new Set(friendIds)
  const ids = found.map((u) => u.id)

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
      esAmigo: friendSet.has(u.id),
      amigosEnComun: mutualByUser.get(u.id) || 0,
    })),
  })
}

// Recomendaciones: amigos de tus amigos, ordenados por amigos en común (desc).
export async function recommendations(req, res) {
  const friendIds = await myFriendIds(req.user.id)
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
      const users = await prisma.user.findMany({ where: { id: { in: ids } } })
      const byId = new Map(users.map((u) => [u.id, u]))
      recs = grouped
        .map((g) => {
          const u = byId.get(g.friendId)
          return u
            ? { ...publicUser(u), online: isOnline(u), amigosEnComun: g._count.userId }
            : null
        })
        .filter(Boolean)
    }
  }

  // Si aún no tienes amigos, sugerimos caras nuevas de la comunidad.
  if (recs.length === 0) {
    const friendSet = new Set(friendIds)
    const recientes = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
    recs = recientes
      .filter((u) => !friendSet.has(u.id))
      .map((u) => ({ ...publicUser(u), online: isOnline(u), amigosEnComun: 0 }))
  }

  res.json({ usuarios: recs })
}

// Perfil público con su sesión activa, ánimo e historias.
export async function profile(req, res) {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } })
  if (!user) throw ApiError.notFound('Usuario no encontrado')

  const myIds = await myFriendIds(req.user.id)
  const [session, mood, stories, numAmigos, comunes] = await Promise.all([
    prisma.focusSession.findFirst({ where: { userId: user.id, status: 'ACTIVE' } }),
    prisma.mood.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.story.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.count({ where: { userId: user.id } }),
    myIds.length
      ? prisma.friendship.count({ where: { userId: user.id, friendId: { in: myIds } } })
      : Promise.resolve(0),
  ])

  res.json({
    perfil: {
      ...publicUser(user),
      online: isOnline(user),
      esAmigo: myIds.includes(user.id),
      numAmigos,
      amigosEnComun: comunes,
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
