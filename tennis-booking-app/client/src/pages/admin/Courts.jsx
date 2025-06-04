import React, { useState } from 'react'
import { Plus, Edit, Trash2, Lock, Unlock, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import courtService from '../../services/courtService'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const courtSchema = yup.object({
  name: yup.string().required('Court name is required'),
  description: yup.string(),
  type: yup.string().oneOf(['indoor', 'outdoor', 'covered']).required('Court type is required'),
  surface: yup.string().oneOf(['hard', 'clay', 'grass', 'synthetic']).required('Surface type is required'),
  features: yup.array().of(yup.string()),
  bookingRules: yup.object({
    minBookingDuration: yup.number().min(15).max(240).required('Min duration is required'),
    maxBookingDuration: yup.number().min(15).max(240).required('Max duration is required'),
    advanceBookingDays: yup.number().min(1).max(30).required('Advance booking days is required'),
    cancellationDeadlineHours: yup.number().min(0).required('Cancellation deadline is required')
  }),
  isActive: yup.boolean()
})

const blockSchema = yup.object({
  reason: yup.string().oneOf(['maintenance', 'event', 'weather', 'other']).required('Reason is required'),
  description: yup.string(),
  startDateTime: yup.date().required('Start date/time is required'),
  endDateTime: yup.date()
    .min(yup.ref('startDateTime'), 'End time must be after start time')
    .required('End date/time is required')
})

const AdminCourts = () => {
  const [editingCourt, setEditingCourt] = useState(null)
  const [deletingCourtId, setDeletingCourtId] = useState(null)
  const [blockingCourt, setBlockingCourt] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const queryClient = useQueryClient()
  
  // Fetch courts
  const { data: courtsData, isLoading } = useQuery('adminCourts', () => 
    courtService.getCourts({ showInactive: true })
  )
  
  const courts = courtsData?.data || []
  
  // Court form
  const {
    register: registerCourt,
    handleSubmit: handleSubmitCourt,
    formState: { errors: courtErrors },
    reset: resetCourt,
    setValue: setCourtValue,
    watch: watchCourt
  } = useForm({
    resolver: yupResolver(courtSchema),
    defaultValues: {
      bookingRules: {
        minBookingDuration: 30,
        maxBookingDuration: 120,
        advanceBookingDays: 7,
        cancellationDeadlineHours: 2
      },
      features: [],
      isActive: true
    }
  })
  
  // Block form
  const {
    register: registerBlock,
    handleSubmit: handleSubmitBlock,
    formState: { errors: blockErrors },
    reset: resetBlock
  } = useForm({
    resolver: yupResolver(blockSchema)
  })
  
  // Mutations
  const createCourt = useMutation(courtService.createCourt, {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCourts')
      toast.success('Court created successfully')
      setShowCreateModal(false)
      resetCourt()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create court')
    }
  })
  
  const updateCourt = useMutation(
    ({ id, data }) => courtService.updateCourt(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCourts')
        toast.success('Court updated successfully')
        setEditingCourt(null)
        resetCourt()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update court')
      }
    }
  )
  
  const deleteCourt = useMutation(courtService.deleteCourt, {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCourts')
      toast.success('Court deleted successfully')
      setDeletingCourtId(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete court')
    }
  })
  
  const blockCourt = useMutation(
    ({ id, data }) => courtService.blockCourt(id, data),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('adminCourts')
        toast.success(`Court blocked successfully`)
        if (data.affectedBookings > 0) {
          toast.info(`${data.affectedBookings} bookings were cancelled`)
        }
        setBlockingCourt(null)
        resetBlock()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to block court')
      }
    }
  )
  
  const unblockCourt = useMutation(
    ({ courtId, blockId }) => courtService.unblockCourt(courtId, blockId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCourts')
        toast.success('Court unblocked successfully')
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to unblock court')
      }
    }
  )
  
  const handleEditCourt = (court) => {
    setEditingCourt(court)
    setCourtValue('name', court.name)
    setCourtValue('description', court.description || '')
    setCourtValue('type', court.type)
    setCourtValue('surface', court.surface)
    setCourtValue('features', court.features || [])
    setCourtValue('bookingRules', court.bookingRules)
    setCourtValue('isActive', court.isActive)
  }
  
  const onSubmitCourt = (data) => {
    if (editingCourt) {
      updateCourt.mutate({ id: editingCourt._id, data })
    } else {
      createCourt.mutate(data)
    }
  }
  
  const onSubmitBlock = (data) => {
    if (blockingCourt) {
      blockCourt.mutate({ id: blockingCourt._id, data })
    }
  }
  
  const features = ['lights', 'seating', 'scoreboard', 'practice_wall']
  const watchFeatures = watchCourt('features') || []
  
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
        <h1 className="text-2xl font-bold text-gray-900">Court Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Court
        </button>
      </div>
      
      {/* Courts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map((court) => (
          <div key={court._id} className={`card ${!court.isActive ? 'opacity-75' : ''}`}>
            <div className="card-body">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    {court.type} • {court.surface} surface
                  </p>
                </div>
                <span className={`badge ${court.isActive ? 'badge-success' : 'badge-error'}`}>
                  {court.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {court.description && (
                <p className="text-sm text-gray-600 mb-3">{court.description}</p>
              )}
              
              {court.features?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {court.features.map((feature) => (
                    <span key={feature} className="badge badge-primary text-xs">
                      {feature.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Duration: {court.bookingRules.minBookingDuration}-{court.bookingRules.maxBookingDuration} min</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Book up to {court.bookingRules.advanceBookingDays} days ahead</span>
                </div>
              </div>
              
              {/* Active Blocks */}
              {court.activeBlocks?.length > 0 && (
                <div className="border-t pt-3 mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Active Blocks:</p>
                  {court.activeBlocks.slice(0, 2).map((block) => (
                    <div key={block._id} className="text-xs text-error-600 mb-1">
                      {format(new Date(block.startDateTime), 'MMM d')} - {block.reason}
                    </div>
                  ))}
                  {court.activeBlocks.length > 2 && (
                    <p className="text-xs text-gray-500">+{court.activeBlocks.length - 2} more</p>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditCourt(court)}
                    className="text-primary-600 hover:text-primary-700"
                    title="Edit court"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setBlockingCourt(court)}
                    className="text-warning-600 hover:text-warning-700"
                    title="Block court"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingCourtId(court._id)}
                    className="text-error-600 hover:text-error-700"
                    title="Delete court"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Create/Edit Court Modal */}
      <Modal
        isOpen={showCreateModal || !!editingCourt}
        onClose={() => {
          setShowCreateModal(false)
          setEditingCourt(null)
          resetCourt()
        }}
        title={editingCourt ? 'Edit Court' : 'Create New Court'}
        size="lg"
      >
        <form onSubmit={handleSubmitCourt(onSubmitCourt)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Court Name</label>
              <input {...registerCourt('name')} className="form-input" placeholder="e.g., Court 1" />
              {courtErrors.name && (
                <p className="form-error">{courtErrors.name.message}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Type</label>
              <select {...registerCourt('type')} className="form-input">
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="covered">Covered</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Surface</label>
              <select {...registerCourt('surface')} className="form-input">
                <option value="hard">Hard</option>
                <option value="clay">Clay</option>
                <option value="grass">Grass</option>
                <option value="synthetic">Synthetic</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="form-label">Description (Optional)</label>
              <textarea
                {...registerCourt('description')}
                className="form-input resize-none"
                rows={3}
                placeholder="Additional details about the court..."
              />
            </div>
          </div>
          
          {/* Features */}
          <div>
            <label className="form-label">Features</label>
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <label key={feature} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={watchFeatures.includes(feature)}
                    onChange={(e) => {
                      const current = watchFeatures || []
                      if (e.target.checked) {
                        setCourtValue('features', [...current, feature])
                      } else {
                        setCourtValue('features', current.filter(f => f !== feature))
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {feature.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Booking Rules */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Booking Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Min Booking Duration (minutes)</label>
                <input
                  {...registerCourt('bookingRules.minBookingDuration')}
                  type="number"
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="form-label">Max Booking Duration (minutes)</label>
                <input
                  {...registerCourt('bookingRules.maxBookingDuration')}
                  type="number"
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="form-label">Advance Booking Days</label>
                <input
                  {...registerCourt('bookingRules.advanceBookingDays')}
                  type="number"
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="form-label">Cancellation Deadline (hours)</label>
                <input
                  {...registerCourt('bookingRules.cancellationDeadlineHours')}
                  type="number"
                  className="form-input"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              {...registerCourt('isActive')}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Court is active and available for booking
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false)
                setEditingCourt(null)
                resetCourt()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCourt.isLoading || updateCourt.isLoading}
              className="btn-primary"
            >
              {createCourt.isLoading || updateCourt.isLoading ? 'Saving...' : 'Save Court'}
            </button>
          </div>
        </form>
      </Modal>
      
      {/* Block Court Modal */}
      <Modal
        isOpen={!!blockingCourt}
        onClose={() => {
          setBlockingCourt(null)
          resetBlock()
        }}
        title={`Block ${blockingCourt?.name}`}
        size="md"
      >
        <form onSubmit={handleSubmitBlock(onSubmitBlock)} className="space-y-4">
          <div>
            <label className="form-label">Reason</label>
            <select {...registerBlock('reason')} className="form-input">
              <option value="maintenance">Maintenance</option>
              <option value="event">Event</option>
              <option value="weather">Weather</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="form-label">Description (Optional)</label>
            <textarea
              {...registerBlock('description')}
              className="form-input resize-none"
              rows={3}
              placeholder="Additional details..."
            />
          </div>
          
          <div>
            <label className="form-label">Start Date/Time</label>
            <input
              {...registerBlock('startDateTime')}
              type="datetime-local"
              className="form-input"
            />
            {blockErrors.startDateTime && (
              <p className="form-error">{blockErrors.startDateTime.message}</p>
            )}
          </div>
          
          <div>
            <label className="form-label">End Date/Time</label>
            <input
              {...registerBlock('endDateTime')}
              type="datetime-local"
              className="form-input"
            />
            {blockErrors.endDateTime && (
              <p className="form-error">{blockErrors.endDateTime.message}</p>
            )}
          </div>
          
          <div className="bg-warning-50 p-3 rounded-lg">
            <p className="text-sm text-warning-800">
              <strong>Warning:</strong> Blocking this court will cancel any existing bookings during this period.
              Affected users will be notified by email.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setBlockingCourt(null)
                resetBlock()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={blockCourt.isLoading}
              className="btn-primary"
            >
              {blockCourt.isLoading ? 'Blocking...' : 'Block Court'}
            </button>
          </div>
        </form>
      </Modal>
      
      {/* Delete Court Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCourtId}
        onClose={() => setDeletingCourtId(null)}
        onConfirm={() => deleteCourt.mutate(deletingCourtId)}
        title="Delete Court"
        message="Are you sure you want to delete this court? This action cannot be undone. The court must not have any active bookings."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

export default AdminCourts