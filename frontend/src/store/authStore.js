import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

function getBaseURL() {
  let url = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
  if (url) {
    url = url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      url = `https://${url}`
    }
    const urlWithoutTrailingSlash = url.replace(/\/+$/, '')
    if (!urlWithoutTrailingSlash.endsWith('/api')) {
      url = `${urlWithoutTrailingSlash}/api`
    }
  }
  return url
}

const authApi = axios.create({
  baseURL: getBaseURL(),
})

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: async (credentials) => {
        const { data } = await authApi.post('/auth/login', credentials)
        set({ user: data.user, token: data.token, isAuthenticated: true })
        return data.user
      },
      register: async (payload) => {
        const { data } = await authApi.post('/auth/register', payload)
        set({ user: data.user, token: data.token, isAuthenticated: true })
        return data.user
      },
      loadMe: async () => {
        const token = useAuthStore.getState().token
        const { data } = await authApi.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        set({ user: data, isAuthenticated: true })
        return data
      },
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'financeiro-pessoal-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
