import { useQuery, useMutation, useQueryClient } from 'react-query'
import bookingService from '../services/bookingService'
import { toast } from 'react-toastify'

export const useMyBookings = (params = {}) => {
  return useQuery(['myBookings', params], () => bookingService.getMyBookings(params), {
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useBooking = (id) => {
  return useQuery(['booking', id], () => bookingService.getBooking(id), {
    enabled: !!id,
  })
}

export const useCreateBooking = () => {
  const queryClient = useQueryClient()
  
  return useMutation(bookingService.createBooking, {
    onSuccess: () => {
      queryClient.invalidateQueries('myBookings')
      queryClient.invalidateQueries('courts')
      toast.success('Booking created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create booking')
    },
  })
}

export const useCancelBooking = () => {
  const queryClient = useQueryClient()
  
  return useMutation(
    ({ id, reason }) => bookingService.cancelBooking(id, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('myBookings')
        queryClient.invalidateQueries('booking')
        toast.success('Booking cancelled successfully')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to cancel booking')
      },
    }
  )
}