import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeEndsAt,
  remainingMs,
  progress,
  colorForProgress,
  isCompleted,
} from '../src/utils/countdown.js'

test('computeEndsAt suma los minutos objetivo al inicio', () => {
  const start = new Date('2026-01-01T10:00:00Z')
  const end = computeEndsAt(start, 90) // 1h30
  assert.equal(end.toISOString(), '2026-01-01T11:30:00.000Z')
})

test('remainingMs nunca es negativo cuando ya pasó el fin', () => {
  const end = new Date('2026-01-01T10:00:00Z')
  const now = new Date('2026-01-01T12:00:00Z')
  assert.equal(remainingMs(end, now), 0)
})

test('remainingMs devuelve el tiempo que falta', () => {
  const end = new Date('2026-01-01T10:30:00Z')
  const now = new Date('2026-01-01T10:00:00Z')
  assert.equal(remainingMs(end, now), 30 * 60_000)
})

test('progress va de 0 a 1 a lo largo de la sesión', () => {
  const start = new Date('2026-01-01T10:00:00Z')
  const end = new Date('2026-01-01T12:00:00Z')
  assert.equal(progress(start, end, start), 0)
  assert.equal(progress(start, end, new Date('2026-01-01T11:00:00Z')), 0.5)
  assert.equal(progress(start, end, end), 1)
})

test('progress se satura en 1 aunque se pase del final', () => {
  const start = new Date('2026-01-01T10:00:00Z')
  const end = new Date('2026-01-01T11:00:00Z')
  assert.equal(progress(start, end, new Date('2026-01-01T15:00:00Z')), 1)
})

test('colorForProgress arranca en coral y termina en salvia', () => {
  assert.equal(colorForProgress(0), 'rgb(224, 122, 95)')
  assert.equal(colorForProgress(1), 'rgb(129, 178, 154)')
})

test('colorForProgress interpola en el punto medio', () => {
  assert.equal(colorForProgress(0.5), 'rgb(177, 150, 125)')
})

test('isCompleted es true solo cuando no queda tiempo', () => {
  const end = new Date('2026-01-01T10:00:00Z')
  assert.equal(isCompleted(end, new Date('2026-01-01T09:59:59Z')), false)
  assert.equal(isCompleted(end, new Date('2026-01-01T10:00:00Z')), true)
})
