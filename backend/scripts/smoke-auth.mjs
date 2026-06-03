const apiUrl = process.env.SMOKE_API_URL ?? 'http://localhost:3333'
const timestamp = Date.now()
const credentials = {
  name: 'Smoke Test',
  email: `smoke.${timestamp}@local.dev`,
  password: '123456',
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed with ${response.status}: ${text}`)
  }

  return data
}

const health = await request('/health')
if (health.status !== 'ok') {
  throw new Error('Health check did not return ok')
}

const registered = await request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(credentials),
})

if (!registered.user?.id || !registered.token) {
  throw new Error('Register did not return user and token')
}

const logged = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: credentials.email,
    password: credentials.password,
  }),
})

if (!logged.user?.id || !logged.token) {
  throw new Error('Login did not return user and token')
}

const me = await request('/api/auth/me', {
  headers: {
    Authorization: `Bearer ${logged.token}`,
  },
})

if (me.email !== credentials.email) {
  throw new Error('Authenticated user does not match registered email')
}

console.log('Sprint 1 auth smoke test passed')
