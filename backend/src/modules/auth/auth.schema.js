import { z } from 'zod'

// Regex de email simple (evita depender de la API concreta de formatos de zod 4).
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const registerSchema = z.object({
  email: z.string().regex(emailRegex, 'Email inválido'),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guion bajo'),
  displayName: z.string().min(1, 'Requerido').max(40, 'Máximo 40 caracteres'),
  password: z.string().min(6, 'Mínimo 6 caracteres').max(72, 'Máximo 72 caracteres'),
})

export const loginSchema = z.object({
  email: z.string().regex(emailRegex, 'Email inválido'),
  password: z.string().min(1, 'Requerido'),
})
