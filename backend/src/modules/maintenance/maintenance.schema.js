import { z } from 'zod'

// Mensaje de apoyo que el coach de ánimo (N8N) crea como reacción del bot.
export const coachReactionSchema = z.object({
  moodId: z.string().min(1, 'moodId requerido'),
  emoji: z.string().min(1).max(8).default('🌱'),
  text: z.string().min(1, 'El mensaje no puede estar vacío').max(280),
})
