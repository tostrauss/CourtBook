import React, { useState } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, AlertCircle, Info, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Pagination from '../../components/common/Pagination'
import announcementService from '../../services/announcementService'
import { toast } from 'react-toastify'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'

const schema = yup.object({
  title: yup.string().required('Title is required').max(200, 'Title cannot exceed 200 characters'),
  content: yup.string().required('Content is required').max(5000, 'Content cannot exceed 5000 characters'),
  type: yup.string().oneOf(['info', 'warning', 'urgent', 'maintenance', 'event']).required('Type is required'),
  priority: yup.number().min(0).max(10).required('Priority is required'),
  targetAudience: yup.string().oneOf(['all', 'members', 'guests', 'staff']).required('Target audience is required'),
  publishDate: yup.date().required('Publish date is required'),
  expiryDate: yup.date().nullable(),
  isActive: yup.boolean(),
  isPinned: yup.boolean()
})

const AdminAnnouncements = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null)
  
  const queryClient = useQueryClient()
  const limit = 10
  
  // Fetch announcements
  const { data, isLoading } = useQuery(
    ['adminAnnouncements', { type: typeFilter, page: currentPage, limit, isActive: 'all' }],
    () => announcementService.getAnnouncements({ 
      type: typeFilter, 
      page: currentPage, 
      limit, 
      isActive: 'all',
      sort: '-isPinned,-priority,-publishDate'
    }),
    { keepPreviousData: true }
  )
  
  const announcements = data?.data || []
  const totalPages = data?.pagination?.pages || 1
  
  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      type: 'info',
      priority: 0,
      targetAudience: 'all',
      publishDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      isActive: true,
      isPinned: false
    }
  })
  
  // Mutations
  const createAnnouncement = useMutation(announcementService.createAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('adminAnnouncements')
      toast.success('Announcement created successfully')
      setShowCreateModal(false)
      reset()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create announcement')
    }
  })
  
  const updateAnnouncement = useMutation(
    ({ id, data }) => announcementService.updateAnnouncement(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminAnnouncements')
        toast.success('Announcement updated successfully')
        setEditingAnnouncement(null)
        reset()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update announcement')
      }
    }
  )
  
  const deleteAnnouncement = useMutation(announcementService.deleteAnnouncement, {
    onSuccess: () => {
      queryClient.invalidateQueries('adminAnnouncements')
      toast.success('Announcement deleted successfully')
      setDeletingAnnouncementId(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete announcement')
    }
  })
  
  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement)
    setValue('title', announcement.title)
    setValue('content', announcement.content)
    setValue('type', announcement.type)
    setValue('priority', announcement.priority)
    setValue('targetAudience', announcement.targetAudience)
    setValue('publishDate', format(new Date(announcement.publishDate), "yyyy-MM-dd'T'HH:mm"))
    setValue('expiryDate', announcement.expiryDate ? format(new Date(announcement.expiryDate), "yyyy-MM-dd'T'HH:mm") : '')
    setValue('isActive', announcement.isActive)
    setValue('isPinned', announcement.isPinned)
  }
  
  const onSubmit = (data) => {
    const formData = {
      ...data,
      publishDate: new Date(data.publishDate).toISOString(),
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : null
    }
    
    if (editingAnnouncement) {
      updateAnnouncement.mutate({ id: editingAnnouncement._id, data: formData })
    } else {
      createAnnouncement.mutate(formData)
    }
  }
  
  const getTypeIcon = (type) => {
    const icons = {
      info: Info,
      warning: AlertCircle,
      urgent: Bell,
      maintenance: AlertCircle,
      event: Bell
    }
    return icons[type] || Info
  }
  
  const getTypeColor = (type) => {
    const colors = {
      info: 'text-primary-600',
      warning: 'text-warning-600',
      urgent: 'text-error-600',
      maintenance: 'text-warning-600',
      event: 'text-success-600'
    }
    return colors[type] || 'text-gray-600'
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
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Announcement
        </button>
      </div>
      
      {/* Type Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => {
            setTypeFilter('')
            setCurrentPage(1)
          }}
          className={`btn-secondary ${typeFilter === '' ? 'bg-gray-200' : ''}`}
        >
          All Types
        </button>
        {['info', 'warning', 'urgent', 'maintenance', 'event'].map((type) => (
          <button
            key={type}
            onClick={() => {
              setTypeFilter(type)
              setCurrentPage(1)
            }}
            className={`btn-secondary ${typeFilter === type ? 'bg-gray-200' : ''}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => {
          const TypeIcon = getTypeIcon(announcement.type)
          const isExpired = announcement.expiryDate && new Date(announcement.expiryDate) < new Date()
          
          return (
            <div 
              key={announcement._id} 
              className={`card ${!announcement.isActive || isExpired ? 'opacity-60' : ''} ${announcement.isPinned ? 'ring-2 ring-primary-500' : ''}`}
            >
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <TypeIcon className={`h-5 w-5 ${getTypeColor(announcement.type)}`} />
                      <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                      <div className="flex items-center space-x-2">
                        {announcement.isPinned && (
                          <span className="badge badge-primary text-xs">Pinned</span>
                        )}
                        <span className={`badge badge-${announcement.type === 'urgent' ? 'error' : announcement.type === 'warning' ? 'warning' : 'primary'} text-xs`}>
                          {announcement.type}
                        </span>
                        <span className="badge badge-primary text-xs">
                          Priority: {announcement.priority}
                        </span>
                        {!announcement.isActive && (
                          <span className="badge badge-error text-xs">Inactive</span>
                        )}
                        {isExpired && (
                          <span className="badge badge-error text-xs">Expired</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 line-clamp-2 mb-3">{announcement.content}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Target: {announcement.targetAudience}</span>
                      <span>Published: {format(new Date(announcement.publishDate), 'MMM d, yyyy')}</span>
                      {announcement.expiryDate && (
                        <span>Expires: {format(new Date(announcement.expiryDate), 'MMM d, yyyy')}</span>
                      )}
                      <span>Views: {announcement.viewCount || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setViewingAnnouncement(announcement)}
                      className="text-gray-600 hover:text-gray-700 p-1"
                      title="View full announcement"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="text-primary-600 hover:text-primary-700 p-1"
                      title="Edit announcement"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingAnnouncementId(announcement._id)}
                      className="text-error-600 hover:text-error-700 p-1"
                      title="Delete announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {announcements.length === 0 && (
        <div className="text-center py-12 card">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No announcements found</p>
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
      
      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!editingAnnouncement}
        onClose={() => {
          setShowCreateModal(false)
          setEditingAnnouncement(null)
          reset()
        }}
        title={editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Title</label>
            <input {...register('title')} className="form-input" placeholder="Announcement title..." />
            {errors.title && (
              <p className="form-error">{errors.title.message}</p>
            )}
          </div>
          
          <div>
            <label className="form-label">Content</label>
            <textarea
              {...register('content')}
              className="form-input resize-none"
              rows={5}
              placeholder="Announcement content..."
            />
            {errors.content && (
              <p className="form-error">{errors.content.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select {...register('type')} className="form-input">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
                <option value="maintenance">Maintenance</option>
                <option value="event">Event</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">Priority (0-10)</label>
              <input
                {...register('priority')}
                type="number"
                min="0"
                max="10"
                className="form-input"
              />
            </div>
            
            <div>
              <label className="form-label">Target Audience</label>
              <select {...register('targetAudience')} className="form-input">
                <option value="all">All</option>
                <option value="members">Members</option>
                <option value="guests">Guests</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Publish Date</label>
              <input
                {...register('publishDate')}
                type="datetime-local"
                className="form-input"
              />
              {errors.publishDate && (
                <p className="form-error">{errors.publishDate.message}</p>
              )}
            </div>
            
            <div>
              <label className="form-label">Expiry Date (Optional)</label>
              <input
                {...register('expiryDate')}
                type="datetime-local"
                className="form-input"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                {...register('isActive')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
            
            <label className="flex items-center">
              <input
                {...register('isPinned')}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Pin to top</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false)
                setEditingAnnouncement(null)
                reset()
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAnnouncement.isLoading || updateAnnouncement.isLoading}
              className="btn-primary"
            >
              {createAnnouncement.isLoading || updateAnnouncement.isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
      
      {/* View Modal */}
      <Modal
        isOpen={!!viewingAnnouncement}
        onClose={() => setViewingAnnouncement(null)}
        title={viewingAnnouncement?.title}
        size="lg"
      >
        {viewingAnnouncement && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className={`badge badge-${viewingAnnouncement.type === 'urgent' ? 'error' : viewingAnnouncement.type === 'warning' ? 'warning' : 'primary'}`}>
                {viewingAnnouncement.type}
              </span>
              <span className="badge badge-primary">
                Priority: {viewingAnnouncement.priority}
              </span>
              <span className="badge badge-primary">
                {viewingAnnouncement.targetAudience}
              </span>
            </div>
            
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{viewingAnnouncement.content}</p>
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>Published: {format(new Date(viewingAnnouncement.publishDate), 'MMMM d, yyyy h:mm a')}</p>
              {viewingAnnouncement.expiryDate && (
                <p>Expires: {format(new Date(viewingAnnouncement.expiryDate), 'MMMM d, yyyy h:mm a')}</p>
              )}
              <p>Views: {viewingAnnouncement.viewCount || 0}</p>
              <p>Created by: {viewingAnnouncement.author?.firstName} {viewingAnnouncement.author?.lastName}</p>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingAnnouncementId}
        onClose={() => setDeletingAnnouncementId(null)}
        onConfirm={() => deleteAnnouncement.mutate(deletingAnnouncementId)}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}

export default AdminAnnouncements