import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerSchema, loginSchema } from '../src/modules/auth/auth.schema.js'

test('registerSchema acepta datos válidos', () => {
  const r = registerSchema.safeParse({
    email: 'ada@brote.app',
    username: 'ada_lovelace',
    displayName: 'Ada',
    password: 'secreta123',
  })
  assert.equal(r.success, true)
})

test('registerSchema rechaza email inválido y password corta', () => {
  const r = registerSchema.safeParse({
    email: 'no-es-email',
    username: 'ada',
    displayName: 'Ada',
    password: '123',
  })
  assert.equal(r.success, false)
  const campos = r.error.issues.map((i) => i.path[0])
  assert.ok(campos.includes('email'))
  assert.ok(campos.includes('password'))
})

test('registerSchema rechaza username con caracteres no permitidos', () => {
  const r = registerSchema.safeParse({
    email: 'ada@brote.app',
    username: 'ada lovelace!',
    displayName: 'Ada',
    password: 'secreta123',
  })
  assert.equal(r.success, false)
})

test('loginSchema exige email y password', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success, true)
  assert.equal(loginSchema.safeParse({ email: 'a@b.com' }).success, false)
})
