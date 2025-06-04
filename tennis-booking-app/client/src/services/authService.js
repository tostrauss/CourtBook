import API from './api'

const authService = {
  register: async (userData) => {
    const { data } = await API.post('/auth/register', userData)
    if (data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken)
    }
    return data
  },

  login: async (credentials) => {
    const { data } = await API.post('/auth/login', credentials)
    if (data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken)
    }
    return data
  },

  logout: async () => {
    try {
      await API.post('/auth/logout')
    } finally {
      localStorage.removeItem('accessToken')
    }
  },

  forgotPassword: async (email) => {
    const { data } = await API.post('/auth/forgot-password', { email })
    return data
  },

  resetPassword: async (token, password) => {
    const { data } = await API.post(`/auth/reset-password/${token}`, { password })
    if (data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken)
    }
    return data
  },

  verifyEmail: async (token) => {
    const { data } = await API.get(`/auth/verify-email/${token}`)
    return data
  },

  refreshToken: async () => {
    const { data } = await API.post('/auth/refresh-token')
    if (data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken)
    }
    return data
  },
}

export default authService
