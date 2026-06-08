import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assertCanAttempt,
  recordFailure,
  recordSuccess,
  _reset,
  MAX_ATTEMPTS,
  WINDOW_MS,
} from '../src/services/loginRateLimit.js'

test('permite hasta 4 intentos fallidos y bloquea el 5º', () => {
  _reset()
  const key = 'ip:user@brote.app'
  const now = 1_000_000

  // Los 4 primeros intentos no deben bloquear.
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    assert.doesNotThrow(() => assertCanAttempt(key, now))
    recordFailure(key, now)
  }

  // El 5º (tras 4 fallos en la ventana) debe lanzar 429.
  assert.throws(() => assertCanAttempt(key, now), (err) => err.statusCode === 429)
})

test('un login correcto reinicia el contador', () => {
  _reset()
  const key = 'ip:user@brote.app'
  const now = 2_000_000

  for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure(key, now)
  assert.throws(() => assertCanAttempt(key, now), (err) => err.statusCode === 429)

  recordSuccess(key) // se limpia el historial de fallos
  assert.doesNotThrow(() => assertCanAttempt(key, now))
})

test('los fallos caducan al pasar la ventana de 10 minutos', () => {
  _reset()
  const key = 'ip:user@brote.app'
  const start = 3_000_000

  for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure(key, start)
  assert.throws(() => assertCanAttempt(key, start), (err) => err.statusCode === 429)

  // Justo después de la ventana, los fallos antiguos ya no cuentan.
  assert.doesNotThrow(() => assertCanAttempt(key, start + WINDOW_MS + 1))
})

test('el bloqueo informa de cuántos segundos quedan (retryAfterSeconds)', () => {
  _reset()
  const key = 'ip:user@brote.app'
  const now = 4_000_000

  for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure(key, now)
  assert.throws(
    () => assertCanAttempt(key, now),
    (err) => err.statusCode === 429 && err.details?.retryAfterSeconds > 0,
  )
})
