import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, X, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { format, isPast, isFuture, isToday, addHours } from 'date-fns'
import { useMyBookings, useCancelBooking } from '../hooks/useBookings'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Pagination from '../components/common/Pagination'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { toast } from 'react-toastify'

const MyBookings = () => {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [cancelBookingId, setCancelBookingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  
  const limit = 10
  
  // Fetch bookings based on active tab
  const { data, isLoading } = useMyBookings({
    status: activeTab === 'cancelled' ? 'cancelled' : 'confirmed',
    startDate: activeTab === 'past' ? undefined : new Date().toISOString(),
    endDate: activeTab === 'past' ? new Date().toISOString() : undefined,
    page: currentPage,
    limit,
    sort: activeTab === 'past' ? '-date' : 'date'
  })
  
  const cancelBooking = useCancelBooking()
  
  const bookings = data?.data || []
  const totalPages = data?.pagination?.pages || 1
  
  const handleCancelBooking = async () => {
    if (!cancelBookingId) return
    
    try {
      await cancelBooking.mutateAsync({
        id: cancelBookingId,
        reason: cancelReason
      })
      setCancelBookingId(null)
      setCancelReason('')
    } catch (error) {
      console.error('Cancel booking error:', error)
    }
  }
  
  const canCancelBooking = (booking) => {
    const bookingDateTime = new Date(booking.date)
    const [hours, minutes] = booking.startTime.split(':')
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    const cancellationDeadline = addHours(bookingDateTime, -2) // 2 hours before
    return new Date() < cancellationDeadline
  }
  
  const getBookingStatus = (booking) => {
    if (booking.status === 'cancelled') return 'cancelled'
    
    const bookingDateTime = new Date(booking.date)
    const [hours, minutes] = booking.startTime.split(':')
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    if (isPast(bookingDateTime)) return 'completed'
    if (isToday(bookingDateTime)) return 'today'
    return 'upcoming'
  }
  
  const statusColors = {
    upcoming: 'badge-primary',
    today: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-error'
  }
  
  const toggleBookingExpand = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId)
  }
  
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <Link to="/book-court" className="btn-primary">
          Book New Court
        </Link>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('upcoming')
              setCurrentPage(1)
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upcoming'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => {
              setActiveTab('past')
              setCurrentPage(1)
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'past'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => {
              setActiveTab('cancelled')
              setCurrentPage(1)
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cancelled'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cancelled
          </button>
        </nav>
      </div>
      
      {/* Bookings List */}
      {bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const status = getBookingStatus(booking)
            const isExpanded = expandedBooking === booking._id
            
            return (
              <div key={booking._id} className="card hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.court.name}
                        </h3>
                        <span className={`badge ${statusColors[status]}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(booking.date), 'EEEE, MMM d, yyyy')}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          {booking.startTime} - {booking.endTime}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {booking.court.type} • {booking.court.surface}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {status === 'upcoming' && canCancelBooking(booking) && (
                        <button
                          onClick={() => setCancelBookingId(booking._id)}
                          className="text-error-600 hover:text-error-700 p-2 hover:bg-error-50 rounded-lg transition-colors"
                          title="Cancel booking"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleBookingExpand(booking._id)}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 animate-slide-down">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-gray-500">Booking ID</dt>
                          <dd className="font-medium text-gray-900">{booking._id}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Duration</dt>
                          <dd className="font-medium text-gray-900">
                            {(() => {
                              const [startH, startM] = booking.startTime.split(':').map(Number)
                              const [endH, endM] = booking.endTime.split(':').map(Number)
                              const duration = (endH * 60 + endM) - (startH * 60 + startM)
                              return `${duration} minutes`
                            })()}
                          </dd>
                        </div>
                        {booking.players?.length > 0 && (
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500 mb-1">Additional Players</dt>
                            <dd className="font-medium text-gray-900">
                              {booking.players.map((player, index) => (
                                <span key={index}>
                                  {player.name}
                                  {player.email && ` (${player.email})`}
                                  {index < booking.players.length - 1 && ', '}
                                </span>
                              ))}
                            </dd>
                          </div>
                        )}
                        {booking.notes && (
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">Notes</dt>
                            <dd className="font-medium text-gray-900">{booking.notes}</dd>
                          </div>
                        )}
                        {booking.cancellationReason && (
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">Cancellation Reason</dt>
                            <dd className="font-medium text-gray-900">{booking.cancellationReason}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                  
                  {/* Cancellation Warning */}
                  {status === 'upcoming' && !canCancelBooking(booking) && (
                    <div className="mt-4 flex items-center text-sm text-warning-600 bg-warning-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>
                        This booking can no longer be cancelled online (less than 2 hours before start time)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {activeTab} bookings
          </h3>
          <p className="text-gray-600 mb-4">
            {activeTab === 'upcoming' && "You don't have any upcoming bookings."}
            {activeTab === 'past' && "You haven't made any bookings yet."}
            {activeTab === 'cancelled' && "You don't have any cancelled bookings."}
          </p>
          {activeTab === 'upcoming' && (
            <Link to="/book-court" className="btn-primary">
              Book a Court
            </Link>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      
      {/* Cancel Booking Dialog */}
      <ConfirmDialog
        isOpen={!!cancelBookingId}
        onClose={() => {
          setCancelBookingId(null)
          setCancelReason('')
        }}
        onConfirm={handleCancelBooking}
        title="Cancel Booking"
        confirmLabel="Cancel Booking"
        cancelLabel="Keep Booking"
        variant="danger"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
          <div>
            <label className="form-label">
              Reason for cancellation (optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="form-input resize-none"
              rows={3}
              placeholder="Please let us know why you're cancelling..."
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}

export default MyBookings