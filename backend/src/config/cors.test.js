import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAllowedOrigins } from './cors.js'

test('parseAllowedOrigins returns wildcard when no value is provided', () => {
  assert.equal(parseAllowedOrigins(undefined), '*')
  assert.equal(parseAllowedOrigins(''), '*')
})

test('parseAllowedOrigins supports one or more comma-separated origins', () => {
  assert.deepEqual(parseAllowedOrigins('http://localhost:5173'), ['http://localhost:5173'])
  assert.deepEqual(
    parseAllowedOrigins('http://localhost:5173, http://127.0.0.1:5173'),
    ['http://localhost:5173', 'http://127.0.0.1:5173'],
  )
})
