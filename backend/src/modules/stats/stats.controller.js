import { prisma } from '../../lib/prisma.js'
import { computeStreaks, minutesByDay, weekByDay } from '../../utils/stats.js'

// Estadísticas de foco del usuario: rachas, totales, minutos por día (semana y
// mes para el jardín) y últimos ánimos. Todo se calcula de las tablas que ya
// existen: no hay contadores duplicados que puedan desincronizarse.
export async function myStats(req, res) {
  const [completadas, animos] = await Promise.all([
    prisma.focusSession.findMany({
      where: { userId: req.user.id, status: 'COMPLETED', completedAt: { not: null } },
      select: { goalMinutes: true, completedAt: true, type: true },
      orderBy: { completedAt: 'asc' },
    }),
    prisma.mood.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 7,
      select: { mood: true, createdAt: true },
    }),
  ])

  const rachas = computeStreaks(completadas.map((s) => s.completedAt))
  const porTipo = { STUDY: 0, WORK: 0 }
  let totalMinutos = 0
  for (const s of completadas) {
    porTipo[s.type] += s.goalMinutes
    totalMinutos += s.goalMinutes
  }

  res.json({
    stats: {
      rachaActual: rachas.actual,
      mejorRacha: rachas.mejor,
      totalSesiones: completadas.length,
      totalMinutos,
      porTipo,
      semana: weekByDay(completadas), // semana de calendario: lunes → domingo
      mes: minutesByDay(completadas, 28), // 4 semanas → el jardín del perfil
      animos: animos.map((m) => ({ mood: m.mood, fecha: m.createdAt })),
    },
  })
}
