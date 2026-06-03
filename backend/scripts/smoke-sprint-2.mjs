const apiUrl = process.env.SMOKE_API_URL ?? 'http://localhost:3333'
const timestamp = Date.now()

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} failed with ${response.status}: ${text}`)
  }

  return data
}

async function requestExpectingError(path, options = {}, expectedStatus) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status !== expectedStatus) {
    const text = await response.text()
    throw new Error(`${options.method ?? 'GET'} ${path} expected ${expectedStatus}, got ${response.status}: ${text}`)
  }
}

async function registerUser(label) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: `Smoke ${label}`,
      email: `smoke.${label}.${timestamp}@local.dev`,
      password: '123456',
    }),
  })

  return {
    user: data.user,
    token: data.token,
    headers: { Authorization: `Bearer ${data.token}` },
  }
}

const primary = await registerUser('primary')
const secondary = await registerUser('secondary')

const category = await request('/api/categories', {
  method: 'POST',
  headers: primary.headers,
  body: JSON.stringify({
    name: 'Mercado',
    color: '#16a34a',
    icon: 'shopping-cart',
    type: 'EXPENSE',
  }),
})

if (!category.id || category.name !== 'Mercado') {
  throw new Error('Category creation did not return expected category')
}

const updatedCategory = await request(`/api/categories/${category.id}`, {
  method: 'PUT',
  headers: primary.headers,
  body: JSON.stringify({
    name: 'Supermercado',
    color: '#2563eb',
    icon: 'basket',
    type: 'EXPENSE',
  }),
})

if (updatedCategory.name !== 'Supermercado' || updatedCategory.color !== '#2563eb') {
  throw new Error('Category update did not persist changes')
}

const foreignCategory = await request('/api/categories', {
  method: 'POST',
  headers: secondary.headers,
  body: JSON.stringify({
    name: 'Categoria de outro usuario',
    type: 'EXPENSE',
  }),
})

await requestExpectingError(
  '/api/transactions',
  {
    method: 'POST',
    headers: primary.headers,
    body: JSON.stringify({
      type: 'EXPENSE',
      amount: 10,
      description: 'Uso indevido',
      date: '2026-05-31',
      categoryId: foreignCategory.id,
    }),
  },
  400,
)

const firstTransaction = await request('/api/transactions', {
  method: 'POST',
  headers: primary.headers,
  body: JSON.stringify({
    type: 'EXPENSE',
    amount: 89.9,
    description: 'Compra mensal',
    date: '2026-05-31',
    categoryId: category.id,
  }),
})

await request('/api/transactions', {
  method: 'POST',
  headers: primary.headers,
  body: JSON.stringify({
    type: 'INCOME',
    amount: 250,
    description: 'Freela',
    date: '2026-05-30',
  }),
})

const filteredTransactions = await request(
  `/api/transactions?type=EXPENSE&categoryId=${category.id}&startDate=2026-05-01&endDate=2026-05-31&page=1&limit=1`,
  { headers: primary.headers },
)

if (filteredTransactions.data.length !== 1 || filteredTransactions.data[0].id !== firstTransaction.id) {
  throw new Error('Transaction filters did not return the expected transaction')
}

if (filteredTransactions.meta.page !== 1 || filteredTransactions.meta.limit !== 1 || filteredTransactions.meta.total < 1) {
  throw new Error('Transaction pagination meta is invalid')
}

await request(`/api/transactions/${firstTransaction.id}`, {
  method: 'PUT',
  headers: primary.headers,
  body: JSON.stringify({
    description: 'Compra mensal revisada',
    amount: 99.9,
    categoryId: category.id,
  }),
})

await request(`/api/transactions/${firstTransaction.id}`, {
  method: 'DELETE',
  headers: primary.headers,
})

await request(`/api/categories/${category.id}`, {
  method: 'DELETE',
  headers: primary.headers,
})

console.log('Sprint 2 category and transaction smoke test passed')
