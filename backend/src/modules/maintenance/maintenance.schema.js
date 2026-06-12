import { z } from 'zod'

export const sessionCongratsSchema = z.object({
  userId: z.string().min(1, 'userId requerido'),
  text: z.string().min(1, 'Texto requerido').max(500, 'Máximo 500 caracteres'),
})
