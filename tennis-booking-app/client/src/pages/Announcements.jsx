import React, { useState } from 'react'
import { Bell, Info, AlertCircle, Calendar, ChevronDown, ChevronUp, Pin } from 'lucide-react'
import { format } from 'date-fns'
import { useAnnouncements } from '../hooks/useAnnouncements'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Pagination from '../components/common/Pagination'

const Announcements = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null)
  
  const limit = 10
  
  const { data, isLoading } = useAnnouncements({
    type: typeFilter,
    page: currentPage,
    limit
  })
  
  const announcements = data?.data || []
  const totalPages = data?.pagination?.pages || 1
  
  const getTypeIcon = (type) => {
    const icons = {
      info: Info,
      warning: AlertCircle,
      urgent: Bell,
      maintenance: AlertCircle,
      event: Calendar
    }
    return icons[type] || Info
  }
  
  const getTypeColor = (type) => {
    const colors = {
      info: 'text-primary-600 bg-primary-50',
      warning: 'text-warning-600 bg-warning-50',
      urgent: 'text-error-600 bg-error-50',
      maintenance: 'text-warning-600 bg-warning-50',
      event: 'text-success-600 bg-success-50'
    }
    return colors[type] || 'text-gray-600 bg-gray-50'
  }
  
  const getBadgeColor = (type) => {
    const colors = {
      info: 'badge-primary',
      warning: 'badge-warning',
      urgent: 'badge-error',
      maintenance: 'badge-warning',
      event: 'badge-success'
    }
    return colors[type] || 'badge-primary'
  }
  
  const toggleExpand = (announcementId) => {
    setExpandedAnnouncement(expandedAnnouncement === announcementId ? null : announcementId)
  }
  
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  // Separate pinned and regular announcements
  const pinnedAnnouncements = announcements.filter(a => a.isPinned)
  const regularAnnouncements = announcements.filter(a => !a.isPinned)
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-600 mt-1">
          Stay updated with the latest news and information from the tennis club
        </p>
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
          All
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
      
      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Pin className="h-4 w-4 mr-1" />
            Pinned Announcements
          </h2>
          <div className="space-y-4">
            {pinnedAnnouncements.map((announcement) => {
              const TypeIcon = getTypeIcon(announcement.type)
              const isExpanded = expandedAnnouncement === announcement._id
              
              return (
                <div 
                  key={announcement._id} 
                  className="card ring-2 ring-primary-500"
                >
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${getTypeColor(announcement.type)}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {announcement.title}
                              </h3>
                              <span className={`badge ${getBadgeColor(announcement.type)} text-xs`}>
                                {announcement.type}
                              </span>
                              <span className="badge badge-primary text-xs">
                                <Pin className="h-3 w-3" />
                              </span>
                            </div>
                            
                            <p className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {announcement.content}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                              <span>{format(new Date(announcement.publishDate), 'MMM d, yyyy')}</span>
                              {announcement.author && (
                                <span>by {announcement.author.firstName} {announcement.author.lastName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {announcement.content.length > 150 && (
                        <button
                          onClick={() => toggleExpand(announcement._id)}
                          className="ml-4 text-gray-400 hover:text-gray-600 p-1"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Regular Announcements */}
      <div className="space-y-4">
        {regularAnnouncements.map((announcement) => {
          const TypeIcon = getTypeIcon(announcement.type)
          const isExpanded = expandedAnnouncement === announcement._id
          
          return (
            <div key={announcement._id} className="card hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(announcement.type)}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {announcement.title}
                          </h3>
                          <span className={`badge ${getBadgeColor(announcement.type)} text-xs`}>
                            {announcement.type}
                          </span>
                          {announcement.isNew && (
                            <span className="badge badge-success text-xs">New</span>
                          )}
                        </div>
                        
                        <p className={`text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {announcement.content}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-3">
                          <span>{format(new Date(announcement.publishDate), 'MMM d, yyyy')}</span>
                          {announcement.author && (
                            <span>by {announcement.author.firstName} {announcement.author.lastName}</span>
                          )}
                          {announcement.expiryDate && (
                            <span className="text-warning-600">
                              Expires {format(new Date(announcement.expiryDate), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {announcement.content.length > 150 && (
                    <button
                      onClick={() => toggleExpand(announcement._id)}
                      className="ml-4 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {announcements.length === 0 && (
        <div className="text-center py-12 card">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
          <p className="text-gray-600">
            There are no announcements to display at this time.
          </p>
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
    </div>
  )
}

export default Announcements