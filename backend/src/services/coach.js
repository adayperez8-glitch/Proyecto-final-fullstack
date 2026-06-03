import { env } from '../config/env.js'

// Avisa al workflow "coach de ánimo" de N8N de que alguien registró su ánimo.
// Es fire-and-forget: nunca debe bloquear ni romper la petición original.
// Toda la lógica condicional (¿negativo? ¿ayer fue positivo?) vive en N8N.
export async function notifyMoodCoach(payload) {
  if (!env.coach.webhookUrl) return { sent: false, reason: 'no-webhook' }
  try {
    await fetch(env.coach.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { sent: true }
  } catch (e) {
    console.error('coach webhook:', e.message)
    return { sent: false, reason: e.message }
  }
}
