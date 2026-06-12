import { env } from '../config/env.js'

// Avisa al workflow de N8N cuando alguien COMPLETA una sesión de foco.
// Es fire-and-forget: la automatización nunca debe bloquear ni romper la
// petición original (si N8N no está levantado, simplemente no hay felicitación).
export async function notifySessionCompleted(payload) {
  if (!env.n8n.sessionWebhookUrl) return { sent: false, reason: 'no-webhook' }
  try {
    await fetch(env.n8n.sessionWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { sent: true }
  } catch (e) {
    console.error('n8n webhook:', e.message)
    return { sent: false, reason: e.message }
  }
}
