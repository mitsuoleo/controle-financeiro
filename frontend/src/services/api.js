import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api',
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

export function getApiError(error, fallback = 'Nao foi possivel concluir a acao.') {
  if (!error.response) {
    return 'Nao foi possivel conectar na API. Verifique se o backend esta rodando em http://localhost:3333.'
  }

  return error.response?.data?.error ?? fallback
}
