import API from './api'

const bookingService = {
  createBooking: async (bookingData) => {
    const { data } = await API.post('/bookings', bookingData)
    return data.data
  },

  getMyBookings: async (params = {}) => {
    const { data } = await API.get('/bookings/my-bookings', { params })
    return data
  },

  getBooking: async (id) => {
    const { data } = await API.get(`/bookings/${id}`)
    return data.data
  },

  cancelBooking: async (id, reason = '') => {
    const { data } = await API.put(`/bookings/${id}/cancel`, { reason })
    return data.data
  },

  // Admin functions
  getAllBookings: async (params = {}) => {
    const { data } = await API.get('/bookings', { params })
    return data
  },

  updateBooking: async (id, bookingData) => {
    const { data } = await API.put(`/bookings/${id}`, bookingData)
    return data.data
  },

  deleteBooking: async (id) => {
    const { data } = await API.delete(`/bookings/${id}`)
    return data
  },
}

export default bookingService