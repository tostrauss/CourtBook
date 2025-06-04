import API from './api'

const announcementService = {
  getAnnouncements: async (params = {}) => {
    const { data } = await API.get('/announcements', { params })
    return data
  },

  getAnnouncement: async (id) => {
    const { data } = await API.get(`/announcements/${id}`)
    return data.data
  },

  // Admin functions
  createAnnouncement: async (announcementData) => {
    const { data } = await API.post('/announcements', announcementData)
    return data.data
  },

  updateAnnouncement: async (id, announcementData) => {
    const { data } = await API.put(`/announcements/${id}`, announcementData)
    return data.data
  },

  deleteAnnouncement: async (id) => {
    const { data } = await API.delete(`/announcements/${id}`)
    return data
  },
}

export default announcementService