import { useQuery, useMutation, useQueryClient } from 'react-query'
import announcementService from '../services/announcementService'
import { toast } from 'react-toastify'

export const useAnnouncements = (params = {}) => {
  return useQuery(['announcements', params], () => announcementService.getAnnouncements(params), {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useAnnouncement = (id) => {
  return useQuery(['announcement', id], () => announcementService.getAnnouncement(id), {
    enabled: !!id,
  })
}

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient()
  
  return useMutation(announcementService.createAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('announcements')
      toast.success('Announcement created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create announcement')
    },
  })
}

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, data }) => announcementService.updateAnnouncement(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['announcement', variables.id])
        queryClient.invalidateQueries('announcements')
        toast.success('Announcement updated successfully!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update announcement')
      },
    }
  )
}

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient()
  
  return useMutation(announcementService.deleteAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('announcements')
      toast.success('Announcement deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete announcement')
    },
  })
}