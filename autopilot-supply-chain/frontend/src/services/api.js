import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/auth/refresh`,
          { refresh_token: refreshToken }
        )
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── API helpers ────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (d) => api.post('/api/v1/auth/register', d),
  login: (d) => api.post('/api/v1/auth/login', d),
  verifyOtp: (d) => api.post('/api/v1/auth/verify-otp', d),
  refresh: (d) => api.post('/api/v1/auth/refresh', d),
  me: () => api.get('/api/v1/auth/me'),
}

export const dashboardAPI = {
  kpis: () => api.get('/api/v1/dashboard/kpis'),
}

export const shipmentAPI = {
  list: (p) => api.get('/api/v1/shipments', { params: p }),
  get: (id) => api.get(`/api/v1/shipments/${id}`),
  create: (d) => api.post('/api/v1/shipments', d),
  update: (id, d) => api.patch(`/api/v1/shipments/${id}`, d),
  delete: (id) => api.delete(`/api/v1/shipments/${id}`),
}

export const inventoryAPI = {
  list: (p) => api.get('/api/v1/inventory', { params: p }),
  create: (d) => api.post('/api/v1/inventory', d),
  update: (id, d) => api.patch(`/api/v1/inventory/${id}`, d),
}

export const supplierAPI = {
  list: (p) => api.get('/api/v1/suppliers', { params: p }),
  create: (d) => api.post('/api/v1/suppliers', d),
  get: (id) => api.get(`/api/v1/suppliers/${id}`),
}

export const alertAPI = {
  list: (p) => api.get('/api/v1/alerts', { params: p }),
  acknowledge: (id) => api.patch(`/api/v1/alerts/${id}/acknowledge`),
  resolve: (id) => api.patch(`/api/v1/alerts/${id}/resolve`),
}

export const adminAPI = {
  users: () => api.get('/api/v1/admin/users'),
  updateRole: (id, role) => api.patch(`/api/v1/admin/users/${id}/role`, { role }),
  toggleActive: (id) => api.patch(`/api/v1/admin/users/${id}/toggle-active`),
}
