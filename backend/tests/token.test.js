import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signToken, verifyToken } from '../src/services/token.js'

test('signToken + verifyToken conserva el payload', () => {
  const token = signToken({ sub: 'user-1', role: 'USER' })
  const payload = verifyToken(token)
  assert.equal(payload.sub, 'user-1')
  assert.equal(payload.role, 'USER')
})

test('verifyToken lanza con un token inválido', () => {
  assert.throws(() => verifyToken('no-es-un-token'))
})
