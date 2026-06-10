// Tests de integración contra la API con base de datos real: registro → login
// → sesiones (reglas de negocio) → solicitudes de amistad → privacidad.
// Si no hay BD accesible (p.ej. entorno sin DATABASE_URL), se saltan solos.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

const app = createApp()

let dbOk = true
try {
  await prisma.$queryRaw`SELECT 1`
} catch {
  dbOk = false
}
const skip = dbOk ? false : 'sin base de datos accesible (DATABASE_URL)'

// Sufijo único por ejecución: los tests no chocan entre sí ni con el seed.
const suf = `t${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
const nuevoUsuario = (nombre) => ({
  email: `${nombre}_${suf}@test.brote`,
  username: `${nombre}_${suf}`.slice(0, 20),
  displayName: `${nombre} test`,
  password: 'password123',
})

const ana = nuevoUsuario('ana')
const ben = nuevoUsuario('ben')
const cleo = nuevoUsuario('cleo')
const tokens = {}
const ids = {}

after(async () => {
  if (dbOk) {
    // Borra los usuarios del test; el resto cae en cascada (sesiones, etc.).
    await prisma.user.deleteMany({ where: { email: { contains: suf } } })
  }
  await prisma.$disconnect()
})

async function registra(u) {
  const res = await request(app).post('/api/auth/register').send(u)
  assert.equal(res.status, 201)
  assert.ok(res.body.token)
  assert.equal(res.body.usuario.passwordHash, undefined) // nunca se filtra
  tokens[u.username] = res.body.token
  ids[u.username] = res.body.usuario.id
}
const auth = (u) => ({ Authorization: `Bearer ${tokens[u.username]}` })

test('registro, login y /auth/me funcionan de extremo a extremo', { skip }, async () => {
  await registra(ana)
  await registra(ben)
  await registra(cleo)

  // email duplicado → 409
  const dup = await request(app).post('/api/auth/register').send(ana)
  assert.equal(dup.status, 409)

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: ana.email, password: ana.password })
  assert.equal(login.status, 200)

  const me = await request(app).get('/api/auth/me').set(auth(ana))
  assert.equal(me.status, 200)
  assert.equal(me.body.usuario.email, ana.email)
})

test('sesiones: única activa, completar requiere terminar la cuenta atrás', { skip }, async () => {
  const crea = await request(app)
    .post('/api/sessions')
    .set(auth(ana))
    .send({ type: 'STUDY', goalMinutes: 60 })
  assert.equal(crea.status, 201)
  const sesionId = crea.body.sesion.id

  // Regla: solo una sesión activa a la vez.
  const segunda = await request(app)
    .post('/api/sessions')
    .set(auth(ana))
    .send({ type: 'WORK', goalMinutes: 30 })
  assert.equal(segunda.status, 409)

  // Regla anti-trampas: no se puede completar antes de que acabe el tiempo.
  const completa = await request(app).patch(`/api/sessions/${sesionId}/complete`).set(auth(ana))
  assert.equal(completa.status, 400)

  // Cancelar sí está permitido en cualquier momento.
  const cancela = await request(app).patch(`/api/sessions/${sesionId}/cancel`).set(auth(ana))
  assert.equal(cancela.status, 200)
  assert.equal(cancela.body.sesion.status, 'CANCELLED')
})

test('amistad: solicitud → aceptar → amigos (sin consentimiento no hay amistad)', { skip }, async () => {
  // Ana solicita a Ben: todavía NO son amigos.
  const sol = await request(app)
    .post('/api/friends/requests')
    .set(auth(ana))
    .send({ toId: ids[ben.username] })
  assert.equal(sol.status, 201)
  assert.equal(sol.body.esAmigo, false)

  const amigosAntes = await request(app).get('/api/friends').set(auth(ana))
  assert.equal(amigosAntes.body.amigos.length, 0)

  // Ben ve la solicitud y la acepta → ahora sí.
  const pendientes = await request(app).get('/api/friends/requests').set(auth(ben))
  assert.equal(pendientes.body.recibidas.length, 1)
  const reqId = pendientes.body.recibidas[0].id

  const acepta = await request(app).patch(`/api/friends/requests/${reqId}/accept`).set(auth(ben))
  assert.equal(acepta.status, 200)
  assert.equal(acepta.body.esAmigo, true)

  const amigosDespues = await request(app).get('/api/friends').set(auth(ana))
  assert.equal(amigosDespues.body.amigos.length, 1)
  assert.equal(amigosDespues.body.amigos[0].id, ids[ben.username])
})

test('privacidad: las historias y el perfil solo se ven entre amigos', { skip }, async () => {
  // Ben sube una historia.
  const hist = await request(app)
    .post('/api/stories')
    .set(auth(ben))
    .send({ text: 'hola desde el test', bgColor: '#e8c5b8' })
  assert.equal(hist.status, 201)
  const storyId = hist.body.historia.id

  // Ana (amiga) puede verla; Cleo (desconocida) no.
  const veAmiga = await request(app).get(`/api/stories/${storyId}`).set(auth(ana))
  assert.equal(veAmiga.status, 200)
  const veExtraña = await request(app).get(`/api/stories/${storyId}`).set(auth(cleo))
  assert.equal(veExtraña.status, 403)

  // El perfil de Ben para Cleo va sin contenido (privado: true).
  const perfil = await request(app).get(`/api/users/${ben.username}`).set(auth(cleo))
  assert.equal(perfil.status, 200)
  assert.equal(perfil.body.perfil.privado, true)
  assert.equal(perfil.body.perfil.historias.length, 0)
})
