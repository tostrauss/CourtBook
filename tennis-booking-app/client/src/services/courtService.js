import API from './api'

const courtService = {
  getCourts: async (params = {}) => {
    const { data } = await API.get('/courts', { params })
    return data
  },

  getCourt: async (id) => {
    const { data } = await API.get(`/courts/${id}`)
    return data.data
  },

  // Admin functions
  createCourt: async (courtData) => {
    const { data } = await API.post('/courts', courtData)
    return data.data
  },

  updateCourt: async (id, courtData) => {
    const { data } = await API.put(`/courts/${id}`, courtData)
    return data.data
  },

  deleteCourt: async (id) => {
    const { data } = await API.delete(`/courts/${id}`)
    return data
  },

  blockCourt: async (id, blockData) => {
    const { data } = await API.post(`/courts/${id}/block`, blockData)
    return data
  },

  unblockCourt: async (id, blockId) => {
    const { data } = await API.post(`/courts/${id}/unblock/${blockId}`)
    return data
  },
}

export default courtService