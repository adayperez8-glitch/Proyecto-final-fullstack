import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../src/app.js'

const app = createApp()

test('GET /health responde ok', async () => {
  const res = await request(app).get('/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'ok')
})

test('una ruta inexistente devuelve 404 con { error }', async () => {
  const res = await request(app).get('/api/no-existe')
  assert.equal(res.status, 404)
  assert.ok(res.body.error)
})

test('POST /api/auth/login con body vacío devuelve 400 y detalles', async () => {
  const res = await request(app).post('/api/auth/login').send({})
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'Datos inválidos')
  assert.ok(Array.isArray(res.body.details))
})
