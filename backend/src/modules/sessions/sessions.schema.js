import { z } from 'zod'

export const createSessionSchema = z.object({
  type: z.enum(['STUDY', 'WORK']),
  goalMinutes: z
    .number()
    .int('Debe ser un número entero de minutos')
    .min(1, 'Mínimo 1 minuto')
    .max(720, 'Máximo 12 horas (720 min)'),
})
