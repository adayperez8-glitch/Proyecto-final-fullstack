import { z } from 'zod'

// Comentario flotante público sobre la cuenta atrás de alguien.
export const createCommentSchema = z.object({
  sessionId: z.string().min(1, 'sessionId requerido'),
  text: z.string().min(1, 'Escribe algo').max(140, 'Máximo 140 caracteres'),
})
