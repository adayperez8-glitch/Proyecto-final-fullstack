import { z } from 'zod'

const urlRegex = /^https?:\/\/.+/i

// Historia (24h): imagen/vídeo por URL o texto con color de fondo. Al menos uno.
export const createStorySchema = z
  .object({
    imageUrl: z.string().regex(urlRegex, 'URL inválida').optional(),
    mediaType: z.enum(['IMAGE', 'VIDEO']).optional(),
    text: z.string().max(280, 'Máximo 280 caracteres').optional(),
    bgColor: z.string().max(32).optional(),
  })
  .refine((d) => d.imageUrl || d.text, {
    message: 'La historia necesita una imagen o un texto',
    path: ['text'],
  })
