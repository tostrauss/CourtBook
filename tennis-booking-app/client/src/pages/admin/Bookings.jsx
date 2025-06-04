import React, { useState } from 'react'
import { Calendar, Clock, User, MapPin, Filter, Download, X } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import DatePicker from 'react-datepicker'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Pagination from '../../components/common/Pagination'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import bookingService from '../../services/bookingService'
import courtService from '../../services/courtService'
import { toast } from 'react-toastify'

const AdminBookings = () => {
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    courtId: '',
    status: '',
    search: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [cancellingBookingId, setCancellingBookingId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  
  const queryClient = useQueryClient()
  const limit = 20
  
  // Fetch courts for filter
  const { data: courtsData } = useQuery('courts', () => courtService.getCourts())
  const courts = courtsData?.data || []
  
  // Build query params
  const queryParams = {
    page: currentPage,
    limit,
    ...(filters.startDate && { startDate: format(filters.startDate, 'yyyy-MM-dd') }),
    ...(filters.endDate && { endDate: format(filters.endDate, 'yyyy-MM-dd') }),
    ...(filters.courtId && { courtId: filters.courtId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.search && { search: filters.search }),
    sort: '-date'
  }
  
  // Fetch bookings
  const { data, isLoading } = useQuery(
    ['adminBookings', queryParams],
    () => bookingService.getAllBookings(queryParams),
    { keepPreviousData: true }
  )
  
  const bookings = data?.data || []
  const totalPages = data?.pagination?.pages || 1
  
  // Cancel booking mutation
  const cancelBooking = useMutation(
    (id) => bookingService.cancelBooking(id, 'Cancelled by admin'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
        toast.success('Booking cancelled successfully')
        setCancellingBookingId(null)
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to cancel booking')
      }
    }
  )
  
  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'badge-success',
      pending: 'badge-warning',
      cancelled: 'badge-error',
      completed: 'badge-primary',
      'no-show': 'badge-error'
    }
    return colors[status] || 'badge-primary'
  }
  
  const handleFilterReset = () => {
    setFilters({
      startDate: null,
      endDate: null,
      courtId: '',
      status: '',
      search: ''
    })
    setCurrentPage(1)
  }
  
  const handleExport = () => {
    // Implementation for CSV export
    toast.info('Export functionality coming soon')
  }
  
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center ${showFilters ? 'bg-gray-200' : ''}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="card mb-6 animate-slide-down">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="form-label">Start Date</label>
                <DatePicker
                  selected={filters.startDate}
                  onChange={(date) => setFilters({ ...filters, startDate: date })}
                  className="form-input w-full"
                  placeholderText="Select start date"
                  isClearable
                />
              </div>
              
              <div>
                <label className="form-label">End Date</label>
                <DatePicker
                  selected={filters.endDate}
                  onChange={(date) => setFilters({ ...filters, endDate: date })}
                  className="form-input w-full"
                  placeholderText="Select end date"
                  isClearable
                  minDate={filters.startDate}
                />
              </div>
              
              <div>
                <label className="form-label">Court</label>
                <select
                  value={filters.courtId}
                  onChange={(e) => setFilters({ ...filters, courtId: e.target.value })}
                  className="form-input"
                >
                  <option value="">All Courts</option>
                  {courts.map((court) => (
                    <option key={court._id} value={court._id}>
                      {court.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="form-label">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="form-input"
                >
                  <option value="">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="User name or email..."
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={handleFilterReset}
                className="btn-secondary"
              >
                Reset
              </button>
              <button
                onClick={() => setCurrentPage(1)}
                className="btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-600">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{data?.count || 0}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl font-bold text-success-600">
              {bookings.filter(b => b.status === 'confirmed').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-error-600">
              {bookings.filter(b => b.status === 'cancelled').length}
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-600">Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              ${bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Bookings Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Booking ID</th>
                <th className="table-header-cell">User</th>
                <th className="table-header-cell">Court</th>
                <th className="table-header-cell">Date & Time</th>
                <th className="table-header-cell">Duration</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Price</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {bookings.map((booking) => {
                const duration = (() => {
                  const [startH, startM] = booking.startTime.split(':').map(Number)
                  const [endH, endM] = booking.endTime.split(':').map(Number)
                  return (endH * 60 + endM) - (startH * 60 + startM)
                })()
                
                return (
                  <tr key={booking._id}>
                    <td className="table-cell font-mono text-xs">
                      {booking._id}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">
                          {booking.user.firstName} {booking.user.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{booking.user.email}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{booking.court.name}</div>
                        <div className="text-xs text-gray-500">
                          {booking.court.type} • {booking.court.surface}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">
                          {format(new Date(booking.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {booking.startTime} - {booking.endTime}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{duration} min</td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      ${booking.totalPrice?.toFixed(2) || '0.00'}
                    </td>
                    <td className="table-cell">
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => setCancellingBookingId(booking._id)}
                          className="text-error-600 hover:text-error-700 p-1"
                          title="Cancel booking"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings found</p>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      
      {/* Cancel Booking Confirmation */}
      <ConfirmDialog
        isOpen={!!cancellingBookingId}
        onClose={() => setCancellingBookingId(null)}
        onConfirm={() => cancelBooking.mutate(cancellingBookingId)}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? The user will be notified by email."
        confirmLabel="Cancel Booking"
        variant="danger"
      />
    </div>
  )
}

export default AdminBookings