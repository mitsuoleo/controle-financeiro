import axios from 'axios'
import { useAuthStore } from '../store/authStore'

function getBaseURL() {
  const url = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
  if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    return `https://${url}`
  }
  return url
}

export const api = axios.create({
  baseURL: getBaseURL(),
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }

    return Promise.reject(error)
  },
)

export function getApiError(error, fallback = 'Não foi possível concluir a ação') {
  console.error('API Error details:', error)

  if (!error.response) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://localhost:3333'
  }

  // Se o backend retornou um erro estruturado
  if (error.response?.data?.error) {
    return error.response.data.error
  }

  if (error.response?.data?.message) {
    return error.response.data.message
  }

  if (typeof error.response?.data === 'string' && error.response.data.trim().length > 0 && error.response.data.length < 150) {
    return error.response.data.trim()
  }

  // Detalhar o erro com informações de status HTTP e mensagem do Axios
  const status = error.response?.status
  const statusText = error.response?.statusText || ''
  const axiosMessage = error.message || ''

  const details = []
  if (status) details.push(`Código ${status}${statusText ? ' ' + statusText : ''}`)
  if (axiosMessage) details.push(axiosMessage)

  const detailedText = details.length > 0 ? ` (${details.join(' - ')})` : ''

  return `${fallback}${detailedText}`
}

