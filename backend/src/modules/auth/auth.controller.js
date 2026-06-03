import { prisma } from '../../lib/prisma.js'
import { hashPassword, verifyPassword } from '../../services/password.js'
import { signToken } from '../../services/token.js'
import { ApiError } from '../../utils/ApiError.js'
import { sendEmail, emails } from '../../services/email.js'
import { privateUser } from '../../utils/serializers.js'

export async function register(req, res) {
  const { email, username, displayName, password } = req.body

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing) {
    throw ApiError.conflict(
      existing.email === email ? 'Ese email ya está registrado' : 'Ese nombre de usuario ya existe',
    )
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, username, displayName, passwordHash },
  })

  // Integración externa (email de bienvenida) sin bloquear la respuesta.
  sendEmail(emails.welcome(user)).catch((e) => console.error('email bienvenida:', e.message))

  const token = signToken({ sub: user.id, role: user.role })
  res.status(201).json({ usuario: privateUser(user), token })
}

export async function login(req, res) {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw ApiError.unauthorized('Credenciales inválidas')

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw ApiError.unauthorized('Credenciales inválidas')

  const token = signToken({ sub: user.id, role: user.role })
  res.json({ usuario: privateUser(user), token })
}

export async function me(req, res) {
  res.json({ usuario: privateUser(req.user) })
}
