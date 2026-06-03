import { z } from 'zod'

export const createSessionSchema = z.object({
  type: z.enum(['STUDY', 'WORK']),
  goalMinutes: z
    .number()
    .int('Debe ser un número entero de minutos')
    .min(5, 'Mínimo 5 minutos')
    .max(720, 'Máximo 12 horas (720 min)'),
})
