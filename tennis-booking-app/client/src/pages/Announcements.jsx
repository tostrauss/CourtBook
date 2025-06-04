// client/src/pages/Announcements.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Info, AlertTriangle as AlertTriangleIcon, Calendar as CalendarIcon, Pin, Filter, Tag, ArrowRight } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useQuery } from 'react-query';
import announcementService from '../services/announcementService';

// Common Components
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';

const Announcements = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);

  const limit = 8;

  const { data: announcementsData, isLoading, error } = useQuery(
    ['allAnnouncements', typeFilter, currentPage, limit],
    () => announcementService.getAnnouncements({
      type: typeFilter || undefined,
      page: currentPage,
      limit,
      isActive: 'true',
      sort: '-isPinned,-priority,-publishDate'
    }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  const announcements = announcementsData?.data || [];
  const totalPages = announcementsData?.pagination?.pages || 1;

  const getTypeIconAndColor = (type) => {
    switch (type) {
      case 'urgent':
        return { IconComponent: Bell, color: 'text-error-500', bgColor: 'bg-error-50', badgeColor: 'badge-error' };
      case 'warning':
      case 'maintenance':
        return { IconComponent: AlertTriangleIcon, color: 'text-warning-500', bgColor: 'bg-warning-50', badgeColor: 'badge-warning' };
      case 'event':
        return { IconComponent: CalendarIcon, color: 'text-sky-500', bgColor: 'bg-sky-50', badgeColor: 'badge-info' };
      case 'info':
      default:
        return { IconComponent: Info, color: 'text-primary-500', bgColor: 'bg-primary-50', badgeColor: 'badge-primary' };
    }
  };

  const handleViewAnnouncement = (announcement) => {
    setViewingAnnouncement(announcement);
  };

  const announcementTypes = ['info', 'warning', 'urgent', 'maintenance', 'event'];

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-gray-600">Loading Announcements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-error-50 border-error-200">
          <div className="card-body text-center text-error-700 py-16">
            <AlertTriangleIcon className="h-12 w-12 mx-auto mb-3 text-error-400" />
            <p className="text-xl font-semibold">Oops! Something went wrong.</p>
            <p className="text-sm mt-1">{error.response?.data?.message || "Could not load announcements. Please try again later."}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <Bell className="h-16 w-16 text-primary-500 mx-auto mb-3" />
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Club Announcements</h1>
        <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600">
          Stay informed with the latest updates, news, and important notices from the club.
        </p>
      </div>

      <Card className="mb-8 shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <label htmlFor="typeFilter" className="form-label mb-0 sm:mr-2 whitespace-nowrap flex items-center text-sm">
              <Filter className="h-4 w-4 mr-1.5 text-gray-400" /> Filter by Type:
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={typeFilter === '' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => { setTypeFilter(''); setCurrentPage(1); }}
              >
                All
              </Button>
              {announcementTypes.map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {announcements.length === 0 && !isLoading && (
        <Card>
          <div className="card-body text-center py-20 text-gray-500">
            <Info className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-semibold text-gray-700">No announcements found.</p>
            <p className="text-sm mt-1">
              {typeFilter ? `There are no announcements matching the type "${typeFilter}".` : "Check back later for updates!"}
            </p>
          </div>
        </Card>
      )}

      {announcements.length > 0 && (
        <div className="space-y-5">
          {announcements.map((announcement) => {
            const { IconComponent, color, bgColor, badgeColor } = getTypeIconAndColor(announcement.type);
            const publishedDate = parseISO(announcement.publishDate);
            const isNew = differenceInDays(new Date(), publishedDate) <= 3;

            return (
              <Card key={announcement._id} className={`transition-shadow hover:shadow-lg ${announcement.isPinned ? 'border-2 border-primary-400 shadow-primary-100' : ''}`}>
                <div className="p-5">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 p-2.5 rounded-full ${bgColor}`}>
                      <IconComponent className={`h-5 w-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1">
                        <h2 className="text-lg font-semibold text-gray-800 line-clamp-2" title={announcement.title}>
                          {announcement.title}
                        </h2>
                        <div className="flex items-center space-x-2 mt-1 sm:mt-0 flex-shrink-0">
                          {announcement.isPinned && <span className="badge !bg-primary-500 !text-white text-xs"><Pin className="h-3 w-3 mr-1" />Pinned</span>}
                          <span className={`badge ${badgeColor} text-xs capitalize`}>{announcement.type}</span>
                          {isNew && !announcement.isPinned && <span className="badge badge-success text-xs">New</span>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Posted on {format(publishedDate, 'MMMM d,คณะ HH:mm')}
                        {announcement.author && ` by ${announcement.author.firstName || announcement.author.username}`}
                      </p>
                      <div
                        className={`text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none line-clamp-3`}
                        dangerouslySetInnerHTML={{ __html: announcement.content.replace(/\n/g, '<br />') }}
                      />
                      {(announcement.content.length > 200 || announcement.content.split('\n').length > 3) && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => handleViewAnnouncement(announcement)}
                          className="mt-2 p-0 h-auto"
                        >
                          Read More <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {announcement.tags && announcement.tags.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1.5">
                        {announcement.tags.map(tag => (
                          <span key={tag} className="badge !bg-gray-100 !text-gray-600 text-xs flex items-center">
                            <Tag className="h-3 w-3 mr-1" /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && announcements.length > 0 && (
        <div className="mt-10 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <Modal
        isOpen={!!viewingAnnouncement}
        onClose={() => setViewingAnnouncement(null)}
        title={viewingAnnouncement?.title || "Announcement Details"}
        size="lg"
      >
        {viewingAnnouncement && (() => {
          // Destructure IconComponent and other properties here for use within the modal
          const { IconComponent: ModalIcon, color: modalIconColor, bgColor: modalBgColor, badgeColor: modalBadgeColor } = getTypeIconAndColor(viewingAnnouncement.type);
          return (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`flex-shrink-0 p-2 rounded-full ${modalBgColor}`}>
                  <ModalIcon className={`h-5 w-5 ${modalIconColor}`} />
                </div>
                <span className={`badge ${modalBadgeColor} text-xs capitalize`}>{viewingAnnouncement.type}</span>
                {viewingAnnouncement.isPinned && <span className="badge !bg-primary-500 !text-white text-xs"><Pin className="h-3 w-3 mr-1" />Pinned</span>}
              </div>
              <p className="text-xs text-gray-500">
                Posted on {format(parseISO(viewingAnnouncement.publishDate), 'MMMM d,คณะ HH:mm')}
                {viewingAnnouncement.author && ` by ${viewingAnnouncement.author.firstName || viewingAnnouncement.author.username}`}
              </p>
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: viewingAnnouncement.content.replace(/\n/g, '<br />') }}
              />
              {viewingAnnouncement.tags && viewingAnnouncement.tags.length > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Tags:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingAnnouncement.tags.map(tag => (
                      <span key={tag} className="badge !bg-gray-100 !text-gray-600 text-xs flex items-center">
                        <Tag className="h-3 w-3 mr-1" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 text-right">
                <Button variant="secondary" onClick={() => setViewingAnnouncement(null)}>Close</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default Announcements;