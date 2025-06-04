import axios from 'axios'
import { toast } from 'react-toastify'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  withCredentials: true,
})

// Request interceptor
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (error.response?.data?.code === 'TOKEN_EXPIRED') {
        originalRequest._retry = true
        
        try {
          const { data } = await API.post('/auth/refresh-token')
          localStorage.setItem('accessToken', data.data.accessToken)
          API.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`
          originalRequest.headers['Authorization'] = `Bearer ${data.data.accessToken}`
          
          return API(originalRequest)
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('accessToken')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    // Show error toast for non-401 errors
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || 'An error occurred'
      toast.error(message)
    }

    return Promise.reject(error)
  }
)

export default API