import { z } from 'zod'

const urlRegex = /^https?:\/\/.+/i

export const updateMeSchema = z.object({
  displayName: z.string().min(1).max(40).optional(),
  bio: z.string().max(160, 'Máximo 160 caracteres').optional(),
  avatarUrl: z.string().regex(urlRegex, 'URL inválida').optional(),
})

export const setRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
})
