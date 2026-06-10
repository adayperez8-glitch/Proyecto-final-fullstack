import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeStreaks, minutesByDay, dayKey } from '../src/utils/stats.js'

// Fecha fija para que los tests no dependan del día en que se ejecuten.
const HOY = new Date('2026-06-10T15:00:00')
const dia = (offset, hora = '10:00:00') => {
  const d = new Date(HOY)
  d.setDate(d.getDate() + offset)
  const [h, m, s] = hora.split(':')
  d.setHours(Number(h), Number(m), Number(s), 0)
  return d
}

test('computeStreaks sin sesiones devuelve rachas a cero', () => {
  assert.deepEqual(computeStreaks([], HOY), { actual: 0, mejor: 0 })
})

test('computeStreaks cuenta los días consecutivos hasta hoy', () => {
  const fechas = [dia(0), dia(-1), dia(-2)]
  const { actual, mejor } = computeStreaks(fechas, HOY)
  assert.equal(actual, 3)
  assert.equal(mejor, 3)
})

test('la racha sigue viva si hoy aún no hay sesión (terminó ayer)', () => {
  const fechas = [dia(-1), dia(-2)]
  assert.equal(computeStreaks(fechas, HOY).actual, 2)
})

test('un hueco de un día rompe la racha actual pero no la mejor', () => {
  // hace 5, 4 y 3 días (racha de 3) + hoy (racha de 1)
  const fechas = [dia(-5), dia(-4), dia(-3), dia(0)]
  const { actual, mejor } = computeStreaks(fechas, HOY)
  assert.equal(actual, 1)
  assert.equal(mejor, 3)
})

test('varias sesiones el mismo día cuentan como un solo día de racha', () => {
  const fechas = [dia(0, '08:00:00'), dia(0, '20:00:00'), dia(-1)]
  assert.equal(computeStreaks(fechas, HOY).actual, 2)
})

test('minutesByDay rellena la semana con ceros y suma por día', () => {
  const sesiones = [
    { completedAt: dia(0), goalMinutes: 50 },
    { completedAt: dia(0, '21:00:00'), goalMinutes: 25 },
    { completedAt: dia(-2), goalMinutes: 90 },
  ]
  const semana = minutesByDay(sesiones, 7, HOY)
  assert.equal(semana.length, 7)
  assert.equal(semana.at(-1).fecha, dayKey(HOY))
  assert.equal(semana.at(-1).minutos, 75)
  assert.equal(semana.at(-1).sesiones, 2)
  assert.equal(semana.at(-3).minutos, 90)
  assert.equal(semana.at(-2).minutos, 0) // ayer, sin sesiones
})

test('minutesByDay ignora sesiones fuera de la ventana', () => {
  const sesiones = [{ completedAt: dia(-10), goalMinutes: 60 }]
  const semana = minutesByDay(sesiones, 7, HOY)
  assert.ok(semana.every((d) => d.minutos === 0))
})
