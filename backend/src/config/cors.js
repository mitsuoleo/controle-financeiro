export function parseAllowedOrigins(value) {
  if (!value) return '*'

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getCorsOptions() {
  const isDev = process.env.NODE_ENV === 'development'

  return {
    origin: isDev ? true : parseAllowedOrigins(process.env.FRONTEND_URL),
    credentials: true,
  }
}

