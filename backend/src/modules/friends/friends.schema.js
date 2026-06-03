import { z } from 'zod'

export const addFriendSchema = z.object({
  friendId: z.string().min(1, 'friendId requerido'),
})
