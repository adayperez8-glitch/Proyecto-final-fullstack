import { z } from 'zod'

export const MOODS = [
  'MOTIVADO',
  'ENERGICO',
  'CONCENTRADO',
  'TRANQUILO',
  'CANSADO',
  'FRUSTRADO',
  'ANSIOSO',
  'DESANIMADO',
]

export const setMoodSchema = z.object({
  mood: z.enum(MOODS),
  note: z.string().max(140, 'Máximo 140 caracteres').optional(),
})
