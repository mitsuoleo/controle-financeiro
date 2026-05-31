export function parseAllowedOrigins(value) {
  if (!value) return '*'

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getCorsOptions() {
  return {
    origin: parseAllowedOrigins(process.env.FRONTEND_URL),
  }
}
