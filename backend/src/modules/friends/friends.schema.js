import { z } from 'zod'

export const sendRequestSchema = z.object({
  toId: z.string().min(1, 'toId requerido'),
})
