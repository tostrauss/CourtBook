import API from './api'

const userService = {
  getMe: async () => {
    const { data } = await API.get('/users/me')
    return data.data
  },

  updateMe: async (userData) => {
    const { data } = await API.put('/users/me', userData)
    return data.data
  },

  updatePassword: async (passwords) => {
    const { data } = await API.put('/users/me/password', passwords)
    return data
  },

  // Admin functions
  getAllUsers: async (params = {}) => {
    const { data } = await API.get('/users', { params })
    return data
  },

  getUser: async (id) => {
    const { data } = await API.get(`/users/${id}`)
    return data.data
  },

  updateUser: async (id, userData) => {
    const { data } = await API.put(`/users/${id}`, userData)
    return data.data
  },

  deleteUser: async (id) => {
    const { data } = await API.delete(`/users/${id}`)
    return data
  },
}

export default userService