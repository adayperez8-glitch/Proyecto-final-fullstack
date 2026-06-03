import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { publicUser } from '../../utils/serializers.js'

// Una amistad se guarda como dos filas simétricas (mutua).
export async function addFriend(req, res) {
  const { friendId } = req.body
  if (friendId === req.user.id) throw ApiError.badRequest('No puedes añadirte a ti mismo')

  const friend = await prisma.user.findUnique({ where: { id: friendId } })
  if (!friend) throw ApiError.notFound('Usuario no encontrado')

  await prisma.$transaction([
    prisma.friendship.upsert({
      where: { userId_friendId: { userId: req.user.id, friendId } },
      update: {},
      create: { userId: req.user.id, friendId },
    }),
    prisma.friendship.upsert({
      where: { userId_friendId: { userId: friendId, friendId: req.user.id } },
      update: {},
      create: { userId: friendId, friendId: req.user.id },
    }),
  ])

  res.status(201).json({ amigo: publicUser(friend), esAmigo: true })
}

export async function removeFriend(req, res) {
  const { friendId } = req.params
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId: req.user.id, friendId },
        { userId: friendId, friendId: req.user.id },
      ],
    },
  })
  res.json({ ok: true, esAmigo: false })
}

export async function listFriends(req, res) {
  const rows = await prisma.friendship.findMany({
    where: { userId: req.user.id },
    include: { friend: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ amigos: rows.map((r) => publicUser(r.friend)) })
}
