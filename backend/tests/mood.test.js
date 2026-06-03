import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moodCategory, isPositive, isNegative, isSameDay } from '../src/utils/mood.js'

test('moodCategory clasifica los ánimos positivos', () => {
  for (const m of ['MOTIVADO', 'ENERGICO', 'CONCENTRADO', 'TRANQUILO']) {
    assert.equal(moodCategory(m), 'positive')
  }
})

test('moodCategory clasifica los ánimos negativos', () => {
  for (const m of ['CANSADO', 'FRUSTRADO', 'ANSIOSO', 'DESANIMADO']) {
    assert.equal(moodCategory(m), 'negative')
  }
})

test('moodCategory devuelve neutral para algo desconocido', () => {
  assert.equal(moodCategory('LO_QUE_SEA'), 'neutral')
})

test('isPositive / isNegative son coherentes con la categoría', () => {
  assert.equal(isPositive('MOTIVADO'), true)
  assert.equal(isNegative('MOTIVADO'), false)
  assert.equal(isNegative('FRUSTRADO'), true)
  assert.equal(isPositive('FRUSTRADO'), false)
})

test('isSameDay distingue el mismo día de días distintos', () => {
  assert.equal(
    isSameDay(new Date('2026-06-01T08:00:00'), new Date('2026-06-01T23:30:00')),
    true,
  )
  assert.equal(
    isSameDay(new Date('2026-06-01T23:59:00'), new Date('2026-06-02T00:01:00')),
    false,
  )
})
