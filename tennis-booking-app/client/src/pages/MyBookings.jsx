// client/src/pages/MyBookings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, XCircle, AlertTriangle, ChevronDown, ChevronUp, Info, Edit, MessageSquare, DollarSign } from 'lucide-react'; // Added Edit, MessageSquare, DollarSign
import { format, isPast, isFuture, isToday, addHours, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // Ensure useQuery is imported
import bookingService from '../services/bookingService'; // Directly use bookingService
import { useAuth } from '../context/AuthContext'; // For user context if needed for rules

// Common Components
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Input from '../components/common/Input'; // For cancellation reason
import Modal from '../components/common/Modal'; // For cancellation reason input

import { toast } from 'react-toastify';

const MyBookings = () => {
  const { user } = useAuth(); // Get user for potential role-based logic or default name
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const limit = 5; // Number of bookings per page

  const fetchBookingsParams = () => {
    const params = { 
        page: currentPage, 
        limit,
        sort: activeTab === 'past' ? '-date,-startTime' : 'date,startTime' // Sort past descending, upcoming ascending
    };
    if (activeTab === 'upcoming') {
      params.status = 'confirmed'; // Only show confirmed for upcoming
      params.startDate = format(startOfToday(), 'yyyy-MM-dd');
    } else if (activeTab === 'past') {
      params.status = ['completed', 'confirmed', 'no-show']; // Show completed, or confirmed past bookings
      params.endDate = format(addDays(startOfToday(), -1), 'yyyy-MM-dd'); // Up to yesterday
    } else if (activeTab === 'cancelled') {
      params.status = 'cancelled';
    }
    return params;
  };

  const { data: bookingsData, isLoading, error } = useQuery(
    ['myBookings', activeTab, currentPage, limit], // Query key includes dependencies
    () => bookingService.getMyBookings(fetchBookingsParams()),
    { 
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to fetch bookings.");
      }
    }
  );

  const bookings = bookingsData?.data || [];
  const totalPages = bookingsData?.pagination?.pages || 1;
  const totalBookings = bookingsData?.count || 0;

  const cancelBookingMutation = useMutation(
    ({ id, reason }) => bookingService.cancelBooking(id, reason), 
    {
      onSuccess: () => {
        toast.success('Booking cancelled successfully!');
        queryClient.invalidateQueries('myBookings');
        queryClient.invalidateQueries('courtsAvailability'); // Invalidate court slots too
        setShowCancelModal(false);
        setBookingToCancel(null);
        setCancellationReason('');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to cancel booking.');
      }
    }
  );

  const handleOpenCancelModal = (booking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (bookingToCancel) {
      cancelBookingMutation.mutate({ id: bookingToCancel._id, reason: cancellationReason });
    }
  };

  const canCancel = useCallback((booking) => {
    if (!booking || booking.status !== 'confirmed') return false;
    const bookingStartDateTime = parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`); // Ensure date is parsed correctly
    const cancellationDeadlineHours = booking.court?.bookingRules?.cancellationDeadlineHours ?? 2;
    return isFuture(addHours(bookingStartDateTime, -cancellationDeadlineHours));
  }, []);
  
  const getBookingStatusInfo = (booking) => {
    const bookingStartDateTime = parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`);
    if (booking.status === 'cancelled') return { text: 'Cancelled', color: 'badge-error', icon: XCircle };
    if (booking.status === 'completed') return { text: 'Completed', color: 'badge-success', icon: CalendarIcon };
    if (booking.status === 'no-show') return { text: 'No Show', color: 'badge-error', icon: AlertTriangle };
    
    if (isPast(bookingStartDateTime) && booking.status === 'confirmed') return { text: 'Past (Pending Status)', color: 'badge-warning', icon: Clock }; // Or 'Completed' if auto-set
    if (isToday(bookingStartDateTime)) return { text: 'Today', color: 'badge-warning', icon: Clock };
    if (isFuture(bookingStartDateTime)) return { text: 'Upcoming', color: 'badge-primary', icon: CalendarIcon };
    
    return { text: booking.status, color: 'badge-primary', icon: Info }; // Default
  };

  const toggleExpandBooking = (bookingId) => {
    setExpandedBookingId(expandedBookingId === bookingId ? null : bookingId);
  };

  const renderBookingCard = (booking) => {
    const statusInfo = getBookingStatusInfo(booking);
    const isExpanded = expandedBookingId === booking._id;
    const bookingStartDateTime = parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`);

    return (
      <Card key={booking._id} className="mb-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div className="flex-1 mb-3 sm:mb-0">
              <div className="flex items-center mb-1.5">
                <h3 className="text-xl font-semibold text-primary-700 mr-3">{booking.court.name}</h3>
                <span className={`badge ${statusInfo.color} text-xs`}>
                  <statusInfo.icon className="h-3.5 w-3.5 mr-1" />
                  {statusInfo.text}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-1 sm:space-y-0 sm:space-x-4">
                <span className="inline-flex items-center"><CalendarIcon className="h-4 w-4 mr-1.5 text-gray-400" />{format(bookingStartDateTime, 'EEEE, MMM d, yyyy')}</span>
                <span className="inline-flex items-center"><Clock className="h-4 w-4 mr-1.5 text-gray-400" />{booking.startTime} - {booking.endTime}</span>
                <span className="inline-flex items-center capitalize"><MapPin className="h-4 w-4 mr-1.5 text-gray-400" />{booking.court.type} • {booking.court.surface}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-start sm:self-center">
              {booking.status === 'confirmed' && isFuture(bookingStartDateTime) && canCancel(booking) && (
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => handleOpenCancelModal(booking)}
                  isLoading={cancelBookingMutation.isLoading && bookingToCancel?._id === booking._id}
                  icon={XCircle}
                >
                  Cancel
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => toggleExpandBooking(booking._id)} className="p-2">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 animate-slide-down space-y-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Booking Details:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <p><strong className="text-gray-500">ID:</strong> <span className="text-gray-700 font-mono text-xs">{booking._id}</span></p>
                <p><strong className="text-gray-500">Price:</strong> <span className="text-gray-700">€{booking.totalPrice?.toFixed(2) || '0.00'}</span></p>
                {booking.players && booking.players.length > 0 && (
                  <div className="md:col-span-2">
                    <strong className="text-gray-500">Players:</strong>
                    <ul className="list-disc list-inside ml-1">
                      {booking.players.map((p, i) => <li key={i} className="text-gray-700">{p.name}{p.email ? ` (${p.email})` : ''}</li>)}
                    </ul>
                  </div>
                )}
                {booking.notes && <p className="md:col-span-2"><strong className="text-gray-500">Notes:</strong> <span className="text-gray-700">{booking.notes}</span></p>}
                {booking.status === 'cancelled' && booking.cancellationReason && (
                  <p className="md:col-span-2"><strong className="text-gray-500">Cancellation Reason:</strong> <span className="text-gray-700">{booking.cancellationReason}</span></p>
                )}
              </div>
               {booking.status === 'confirmed' && isFuture(bookingStartDateTime) && !canCancel(booking) && (
                <div className="mt-3 flex items-center text-xs text-yellow-700 bg-yellow-50 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Cancellation window has passed for this booking.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <Button as={Link} to="/book-court" variant="primary" icon={CalendarIcon}>
          Book New Court
        </Button>
      </div>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past', label: 'Past' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); setExpandedBookingId(null); }}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {isLoading && (
        <div className="text-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-gray-600">Loading your bookings...</p>
        </div>
      )}

      {!isLoading && error && (
         <Card className="bg-error-50">
            <div className="card-body text-center text-error-700">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2"/>
                <p className="font-semibold">Could not load bookings.</p>
                <p className="text-sm">{error.message || "Please try again later."}</p>
            </div>
        </Card>
      )}

      {!isLoading && !error && bookings.length === 0 && (
        <Card>
            <div className="card-body text-center py-16 text-gray-500">
                <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300"/>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No {activeTab} bookings found.</h3>
                {activeTab === 'upcoming' && (
                    <p className="text-sm mb-6">Looks like you don't have any courts reserved yet.</p>
                )}
                 {activeTab !== 'upcoming' && (
                    <p className="text-sm mb-6">There are no bookings to display in this section.</p>
                )}
                <Button as={Link} to="/book-court" variant="primary" icon={CalendarIcon}>
                    Book a Court
                </Button>
            </div>
        </Card>
      )}

      {!isLoading && !error && bookings.length > 0 && (
        <>
          <div className="space-y-4">
            {bookings.map(renderBookingCard)}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Cancellation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setBookingToCancel(null); setCancellationReason(''); }}
        title="Cancel Booking"
        size="md"
      >
        {bookingToCancel && (
          <form onSubmit={(e) => { e.preventDefault(); handleConfirmCancel(); }}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel your booking for 
                <strong className="text-gray-800"> {bookingToCancel.court.name} </strong> 
                on <strong className="text-gray-800">{format(parseISO(`${bookingToCancel.date.substring(0,10)}T${bookingToCancel.startTime}:00`), 'MMM d, yyyy')}</strong> 
                at <strong className="text-gray-800">{bookingToCancel.startTime}</strong>?
              </p>
              <Input
                id="cancellationReason"
                label="Reason for cancellation (Optional)"
                isTextArea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g., Change of plans"
              />
              <div className="flex justify-end space-x-3 pt-2">
                <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => { setShowCancelModal(false); setBookingToCancel(null); setCancellationReason(''); }}
                    disabled={cancelBookingMutation.isLoading}
                >
                  Keep Booking
                </Button>
                <Button 
                    type="submit" 
                    variant="danger" 
                    isLoading={cancelBookingMutation.isLoading}
                    disabled={cancelBookingMutation.isLoading}
                >
                  Confirm Cancellation
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MyBookings;