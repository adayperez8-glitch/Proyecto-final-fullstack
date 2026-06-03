import { PrismaClient } from '@prisma/client'

// Cliente Prisma único reutilizado en toda la app (evita abrir conexiones de más).
export const prisma = new PrismaClient()
