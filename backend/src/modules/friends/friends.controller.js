import { prisma } from '../../lib/prisma.js'
import { ApiError } from '../../utils/ApiError.js'
import { publicUser } from '../../utils/serializers.js'
import { areFriends } from '../../lib/friendships.js'
import { sendToUser } from '../../lib/events.js'

// La amistad ya no se crea unilateralmente: A envía una solicitud y B decide.
// Aceptar crea las dos filas simétricas de Friendship y borra la solicitud.

// Crea las dos filas simétricas de una amistad (idempotente).
function createFriendshipTx(a, b) {
  return [
    prisma.friendship.upsert({
      where: { userId_friendId: { userId: a, friendId: b } },
      update: {},
      create: { userId: a, friendId: b },
    }),
    prisma.friendship.upsert({
      where: { userId_friendId: { userId: b, friendId: a } },
      update: {},
      create: { userId: b, friendId: a },
    }),
  ]
}

// Envía una solicitud de amistad. Si la otra persona ya me había solicitado,
// se interpreta como aceptación mutua y nos hacemos amigos directamente.
export async function sendRequest(req, res) {
  const { toId } = req.body
  if (toId === req.user.id) throw ApiError.badRequest('No puedes añadirte a ti mismo')

  const to = await prisma.user.findUnique({ where: { id: toId } })
  if (!to) throw ApiError.notFound('Usuario no encontrado')

  if (await areFriends(req.user.id, toId)) {
    return res.json({ esAmigo: true, solicitudEnviada: false })
  }

  // ¿Había una solicitud suya hacia mí? Entonces esto es un "sí" mutuo.
  const inversa = await prisma.friendRequest.findUnique({
    where: { fromId_toId: { fromId: toId, toId: req.user.id } },
  })
  if (inversa) {
    await prisma.$transaction([
      prisma.friendRequest.delete({ where: { id: inversa.id } }),
      ...createFriendshipTx(req.user.id, toId),
    ])
    sendToUser(toId, 'friend', { kind: 'accepted' })
    return res.status(201).json({ esAmigo: true, solicitudEnviada: false })
  }

  // Solicitud nueva (o repetida: upsert la deja igual, idempotente).
  const solicitud = await prisma.friendRequest.upsert({
    where: { fromId_toId: { fromId: req.user.id, toId } },
    update: {},
    create: { fromId: req.user.id, toId },
  })
  sendToUser(toId, 'friend', { kind: 'request' })
  res.status(201).json({ esAmigo: false, solicitudEnviada: true, solicitudId: solicitud.id })
}

// Solicitudes pendientes: las que me llegan y las que envié yo.
export async function listRequests(req, res) {
  const [recibidas, enviadas] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { toId: req.user.id },
      include: { from: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendRequest.findMany({
      where: { fromId: req.user.id },
      include: { to: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  res.json({
    recibidas: recibidas.map((r) => ({ id: r.id, de: publicUser(r.from), createdAt: r.createdAt })),
    enviadas: enviadas.map((r) => ({ id: r.id, para: publicUser(r.to), createdAt: r.createdAt })),
  })
}

// Acepta una solicitud recibida → nace la amistad mutua.
export async function acceptRequest(req, res) {
  const request = await prisma.friendRequest.findUnique({
    where: { id: req.params.id },
    include: { from: true },
  })
  if (!request) throw ApiError.notFound('Solicitud no encontrada')
  if (request.toId !== req.user.id) throw ApiError.forbidden('Esta solicitud no es para ti')

  await prisma.$transaction([
    prisma.friendRequest.delete({ where: { id: request.id } }),
    ...createFriendshipTx(req.user.id, request.fromId),
  ])
  sendToUser(request.fromId, 'friend', { kind: 'accepted' })
  res.json({ amigo: publicUser(request.from), esAmigo: true })
}

// Rechaza una solicitud recibida o cancela una enviada (ambos pueden borrarla).
export async function declineRequest(req, res) {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } })
  if (!request) throw ApiError.notFound('Solicitud no encontrada')
  if (request.toId !== req.user.id && request.fromId !== req.user.id) {
    throw ApiError.forbidden('Esta solicitud no es tuya')
  }
  await prisma.friendRequest.delete({ where: { id: request.id } })
  res.json({ ok: true })
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
