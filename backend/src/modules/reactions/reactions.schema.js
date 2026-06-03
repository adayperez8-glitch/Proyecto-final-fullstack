import { z } from 'zod'

// Mensaje de apoyo (reacción) al estado de ánimo de alguien.
export const createReactionSchema = z.object({
  moodId: z.string().min(1, 'moodId requerido'),
  emoji: z.string().min(1, 'Elige un emoji').max(8),
  text: z.string().max(140, 'Máximo 140 caracteres').optional(),
})
