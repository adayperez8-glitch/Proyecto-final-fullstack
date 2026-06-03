import { z } from 'zod'

// Mensaje directo (MD) o respuesta a una historia. Si es respuesta pública,
// se convierte en un mensaje flotante que todos pueden ver en esa historia.
export const sendMessageSchema = z.object({
  toId: z.string().min(1, 'Destinatario requerido'),
  text: z.string().min(1, 'Escribe un mensaje').max(500, 'Máximo 500 caracteres'),
  storyId: z.string().min(1).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
})
