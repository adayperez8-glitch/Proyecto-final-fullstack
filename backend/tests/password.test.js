import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../src/services/password.js'

test('hashPassword no devuelve la contraseña en claro', async () => {
  const hash = await hashPassword('secreta123')
  assert.notEqual(hash, 'secreta123')
  assert.ok(hash.length > 20)
})

test('verifyPassword acepta la contraseña correcta y rechaza la incorrecta', async () => {
  const hash = await hashPassword('secreta123')
  assert.equal(await verifyPassword('secreta123', hash), true)
  assert.equal(await verifyPassword('otra-cosa', hash), false)
})
