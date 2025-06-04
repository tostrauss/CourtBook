import { useQuery, useMutation, useQueryClient } from 'react-query'
import courtService from '../services/courtService'
import { toast } from 'react-toastify'

export const useCourts = (params = {}) => {
  return useQuery(['courts', params], () => courtService.getCourts(params), {
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useCourt = (id) => {
  return useQuery(['court', id], () => courtService.getCourt(id), {
    enabled: !!id,
  })
}

export const useCreateCourt = () => {
  const queryClient = useQueryClient()
  
  return useMutation(courtService.createCourt, {
    onSuccess: () => {
      queryClient.invalidateQueries('courts')
      toast.success('Court created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create court')
    },
  })
}

export const useUpdateCourt = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => courtService.updateCourt(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['court', variables.id])
        queryClient.invalidateQueries('courts')
        toast.success('Court updated successfully!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update court')
      },
    }
  )
}

export const useDeleteCourt = () => {
  const queryClient = useQueryClient()
  
  return useMutation(courtService.deleteCourt, {
    onSuccess: () => {
      queryClient.invalidateQueries('courts')
      toast.success('Court deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete court')
    },
  })
}

export const useBlockCourt = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => courtService.blockCourt(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['court', variables.id])
        queryClient.invalidateQueries('courts')
        toast.success(`Court blocked successfully! ${data.affectedBookings} bookings were cancelled.`)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to block court')
      },
    }
  )
}