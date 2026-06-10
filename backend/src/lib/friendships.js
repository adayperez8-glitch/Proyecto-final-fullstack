import { prisma } from './prisma.js'

// Consultas de amistad compartidas por varios módulos (DRY).
// La amistad se guarda como dos filas simétricas, así que basta mirar una dirección.

/** IDs de los amigos de un usuario. */
export async function friendIdsOf(userId) {
  const rows = await prisma.friendship.findMany({ where: { userId }, select: { friendId: true } })
  return rows.map((r) => r.friendId)
}

/** ¿Son amigos a y b? (true también si son la misma persona) */
export async function areFriends(a, b) {
  if (a === b) return true
  const row = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: a, friendId: b } },
  })
  return Boolean(row)
}
