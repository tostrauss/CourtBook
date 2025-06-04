import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalendarIcon, Clock, MapPin, Users, Info } from 'lucide-react'
import { format, addDays, startOfDay, parse, isBefore, isAfter } from 'date-fns'
import DatePicker from 'react-datepicker'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useCourts } from '../hooks/useCourts'
import { useCreateBooking } from '../hooks/useBookings'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { toast } from 'react-toastify'

const schema = yup.object({
  date: yup.date().required('Date is required'),
  courtId: yup.string().required('Please select a court'),
  startTime: yup.string().required('Start time is required'),
  duration: yup.number().min(30).required('Duration is required'),
  players: yup.array().of(
    yup.object({
      name: yup.string(),
      email: yup.string().email('Invalid email'),
    })
  ),
  notes: yup.string().max(500, 'Notes cannot exceed 500 characters'),
})

const BookCourt = () => {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDuration, setSelectedDuration] = useState(60)
  
  const { data: courtsData, isLoading: courtsLoading } = useCourts({
    date: format(selectedDate, 'yyyy-MM-dd'),
    duration: selectedDuration,
  })
  
  const createBooking = useCreateBooking()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      date: new Date(),
      duration: 60,
      players: [{ name: '', email: '' }],
    },
  })
  
  const watchCourt = watch('courtId')
  const watchStartTime = watch('startTime')
  
  // Get available courts with slots
  const availableCourts = useMemo(() => {
    if (!courtsData?.data) return []
    return courtsData.data.filter(court => court.availableSlots?.length > 0)
  }, [courtsData])
  
  // Get selected court details
  const selectedCourt = useMemo(() => {
    if (!watchCourt || !availableCourts.length) return null
    return availableCourts.find(court => court._id === watchCourt)
  }, [watchCourt, availableCourts])
  
  // Calculate end time
  const endTime = useMemo(() => {
    if (!watchStartTime || !selectedDuration) return ''
    const [hours, minutes] = watchStartTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + selectedDuration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }, [watchStartTime, selectedDuration])
  
  const onSubmit = async (data) => {
    const bookingData = {
      courtId: data.courtId,
      date: format(data.date, 'yyyy-MM-dd'),
      startTime: data.startTime,
      endTime: endTime,
      players: data.players.filter(p => p.name || p.email),
      notes: data.notes,
    }
    
    try {
      await createBooking.mutateAsync(bookingData)
      navigate('/my-bookings')
    } catch (error) {
      console.error('Booking error:', error)
    }
  }
  
  const handleDateChange = (date) => {
    setSelectedDate(date)
    setValue('date', date)
    setValue('courtId', '')
    setValue('startTime', '')
  }
  
  const handleDurationChange = (duration) => {
    setSelectedDuration(duration)
    setValue('duration', duration)
    setValue('courtId', '')
    setValue('startTime', '')
  }
  
  if (courtsLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Book a Court</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Date and Duration Selection */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Select Date & Duration</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  <CalendarIcon className="inline h-4 w-4 mr-1" />
                  Date
                </label>
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 7)}
                  className="form-input w-full"
                  dateFormat="MMMM d, yyyy"
                />
                {errors.date && (
                  <p className="form-error">{errors.date.message}</p>
                )}
              </div>
              
              <div>
                <label className="form-label">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Duration
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="form-input"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Court Selection */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Select Court & Time</h2>
          </div>
          <div className="card-body">
            {availableCourts.length > 0 ? (
              <div className="space-y-4">
                {availableCourts.map((court) => (
                  <div
                    key={court._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      watchCourt === court._id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setValue('courtId', court._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{court.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <MapPin className="inline h-4 w-4 mr-1" />
                          {court.type} • {court.surface} surface
                        </p>
                        {court.features?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {court.features.map((feature) => (
                              <span
                                key={feature}
                                className="badge badge-primary text-xs"
                              >
                                {feature.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        type="radio"
                        {...register('courtId')}
                        value={court._id}
                        className="mt-1"
                      />
                    </div>
                    
                    {watchCourt === court._id && (
                      <div className="mt-4">
                        <label className="form-label">Available Time Slots</label>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                          {court.availableSlots.map((slot) => (
                            <button
                              key={slot.startTime}
                              type="button"
                              onClick={() => setValue('startTime', slot.startTime)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                watchStartTime === slot.startTime
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white border-gray-300 hover:border-primary-500'
                              }`}
                            >
                              {slot.startTime}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {errors.courtId && (
                  <p className="form-error">{errors.courtId.message}</p>
                )}
                {errors.startTime && (
                  <p className="form-error">{errors.startTime.message}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No courts available for the selected date and duration.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try selecting a different date or shorter duration.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Additional Details */}
        {watchCourt && watchStartTime && (
          <div className="card animate-fade-in">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Additional Details</h2>
            </div>
            <div className="card-body space-y-4">
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Booking Summary</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Court:</dt>
                    <dd className="font-medium">{selectedCourt?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Date:</dt>
                    <dd className="font-medium">{format(selectedDate, 'MMMM d, yyyy')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Time:</dt>
                    <dd className="font-medium">{watchStartTime} - {endTime}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Duration:</dt>
                    <dd className="font-medium">{selectedDuration} minutes</dd>
                  </div>
                </dl>
              </div>
              
              {/* Players */}
              <div>
                <label className="form-label">
                  <Users className="inline h-4 w-4 mr-1" />
                  Additional Players (Optional)
                </label>
                <div className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="grid grid-cols-2 gap-3">
                      <input
                        {...register(`players.${index}.name`)}
                        placeholder="Player name"
                        className="form-input"
                      />
                      <input
                        {...register(`players.${index}.email`)}
                        type="email"
                        placeholder="Email (optional)"
                        className="form-input"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label htmlFor="notes" className="form-label">
                  Notes (Optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="form-input"
                  placeholder="Any special requirements or notes..."
                />
                {errors.notes && (
                  <p className="form-error">{errors.notes.message}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createBooking.isLoading || !watchCourt || !watchStartTime}
            className="btn-primary"
          >
            {createBooking.isLoading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BookCourt