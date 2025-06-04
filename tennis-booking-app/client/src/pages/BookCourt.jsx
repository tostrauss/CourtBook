import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, setHours, setMinutes, isBefore, startOfToday, parseISO } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Calendar, Clock, MapPin, Users, DollarSign, AlertTriangle, Info, Filter, Search, Trash2, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { useQuery, useMutation, useQueryClient } from 'react-query';
import courtService from '../services/courtService';
import bookingService from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
// ConfirmDialog might be used later if we add direct cancellation from a calendar view
// import ConfirmDialog from '../components/common/ConfirmDialog'; 
import { toast } from 'react-toastify';

// Setup for react-big-calendar
const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }), // Ensures week starts on Sunday for locale
  getDay,
  locales,
});

const BookCourt = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('day'); // 'day', 'week'
  const [filters, setFilters] = useState({ type: '', surface: '' });
  
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [playerNames, setPlayerNames] = useState([{ name: user?.fullName || user?.username || '', email: user?.email || '', isGuest: false }]);
  const [bookingNotes, setBookingNotes] = useState('');

  const minBookingDate = startOfToday();
  const maxBookingDate = addDays(startOfToday(), (user?.role === 'admin' ? 89 : 6)); // Admin 90 days, user 7 days

  const { data: courtsApiData, isLoading: isLoadingCourts, error: courtsError } = useQuery(
    ['courtsAvailability', format(selectedDate, 'yyyy-MM-dd'), filters.type, filters.surface],
    () => courtService.getCourts({ 
        date: format(selectedDate, 'yyyy-MM-dd'),
        type: filters.type || undefined,
        surface: filters.surface || undefined,
    }),
    {
      enabled: !!selectedDate,
      staleTime: 1 * 60 * 1000, // 1 minute
      refetchOnWindowFocus: true,
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to fetch court availability.");
      }
    }
  );
  
  const courtsWithAvailability = useMemo(() => courtsApiData?.data || [], [courtsApiData]);

  // Transform court availability into events for BigCalendar
  const calendarEvents = useMemo(() => {
    if (!courtsWithAvailability) return [];
    const events = [];
    courtsWithAvailability.forEach(court => {
      if (court.availableSlots) {
        court.availableSlots.forEach(slot => {
          const [startHour, startMinute] = slot.startTime.split(':').map(Number);
          const [endHour, endMinute] = slot.endTime.split(':').map(Number);
          
          const eventStartDate = setMinutes(setHours(new Date(selectedDate), startHour), startMinute);
          const eventEndDate = setMinutes(setHours(new Date(selectedDate), endHour), endMinute);

          events.push({
            title: `Book ${court.name}`, // More descriptive title
            start: eventStartDate,
            end: eventEndDate,
            allDay: false,
            resource: { court, slot }, // Store original data
          });
        });
      }
    });
    return events;
  }, [courtsWithAvailability, selectedDate]);


  const createBookingMutation = useMutation(bookingService.createBooking, {
    onSuccess: (data) => {
      toast.success(`Booking confirmed for ${data.court.name} at ${data.startTime}!`);
      queryClient.invalidateQueries('courtsAvailability');
      queryClient.invalidateQueries(['myBookings']);
      setShowConfirmModal(false);
      setSelectedSlotDetails(null);
      setPlayerNames([{ name: user?.fullName || user?.username || '', email: user?.email || '', isGuest: false }]);
      setBookingNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create booking.');
    }
  });

  const handleDateChange = (date) => {
    if (date && !isBefore(date, minBookingDate)) {
      setSelectedDate(date);
    } else {
      setSelectedDate(minBookingDate);
    }
  };
  
  const handleCalendarNavigate = (newDate) => {
    handleDateChange(newDate);
  };

  const handleSelectEvent = (event) => {
    const { court, slot } = event.resource;
    setSelectedSlotDetails({
      courtId: court._id,
      courtName: court.name,
      courtType: court.type,
      courtSurface: court.surface,
      date: format(selectedDate, 'yyyy-MM-dd'), // Ensure this is the selectedDate
      startTime: slot.startTime,
      endTime: slot.endTime,
      basePrice: court.pricing?.basePrice || 0,
      peakHourMultiplier: court.pricing?.peakHourMultiplier || 1,
      peakHours: court.pricing?.peakHours || [],
    });
    setPlayerNames([{ name: user?.fullName || user?.username || '', email: user?.email || '', isGuest: false }]);
    setBookingNotes('');
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedSlotDetails) return;
    const bookingData = {
      courtId: selectedSlotDetails.courtId,
      date: selectedSlotDetails.date, // This should be the string 'yyyy-MM-dd'
      startTime: selectedSlotDetails.startTime,
      endTime: selectedSlotDetails.endTime,
      players: playerNames.filter(p => p.name.trim() !== ''),
      notes: bookingNotes,
    };
    createBookingMutation.mutate(bookingData);
  };
  
  const handleAddPlayer = () => {
    if (playerNames.length < 4) {
      setPlayerNames([...playerNames, { name: '', email: '', isGuest: true }]);
    } else {
      toast.info("Maximum of 4 players per booking.");
    }
  };

  const handlePlayerChange = (index, field, value) => {
    const updatedPlayers = [...playerNames];
    updatedPlayers[index][field] = value;
    setPlayerNames(updatedPlayers);
  };
  
  const handleRemovePlayer = (index) => {
    if (index === 0 && playerNames.length === 1 && !playerNames[0].isGuest) {
        toast.error("The primary booker cannot be removed.");
        return;
    }
    const updatedPlayers = playerNames.filter((_, i) => i !== index);
    setPlayerNames(updatedPlayers);
  };

  const calculateSlotPrice = useCallback(() => {
    if (!selectedSlotDetails) return "0.00";
    let price = parseFloat(selectedSlotDetails.basePrice) || 0; 
    
    const bookingDateObj = parseISO(selectedSlotDetails.date + "T00:00:00.000Z"); // Treat date as UTC to get correct day
    const dayOfWeek = bookingDateObj.getUTCDay(); 
    const [startHour] = selectedSlotDetails.startTime.split(':').map(Number);

    const isPeak = selectedSlotDetails.peakHours?.some(ph => 
        ph.dayOfWeek === dayOfWeek &&
        startHour >= parseInt(ph.startTime.split(':')[0]) &&
        startHour < parseInt(ph.endTime.split(':')[0])
    );

    if (isPeak && selectedSlotDetails.peakHourMultiplier > 1) {
        price *= parseFloat(selectedSlotDetails.peakHourMultiplier);
    }
    return price.toFixed(2);
  }, [selectedSlotDetails]);

  // Determine min and max times for the calendar view dynamically or use fixed values
  const minTime = useMemo(() => setMinutes(setHours(new Date(selectedDate), 7), 0), [selectedDate]); // 7:00 AM
  const maxTime = useMemo(() => setMinutes(setHours(new Date(selectedDate), 22), 0), [selectedDate]); // 10:00 PM

  const eventStyleGetter = (event, start, end, isSelected) => {
    let backgroundColor = '#3b82f6'; // Default blue (Tailwind primary-500)
    const courtType = event.resource?.court?.type;
    if (courtType === 'indoor') backgroundColor = '#10b981'; // Green (Tailwind emerald-500)
    if (courtType === 'clay') backgroundColor = '#f59e0b'; // Amber (Tailwind amber-500)
    
    const style = {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        padding: '3px 5px',
        fontSize: '0.8rem',
    };
    return { style };
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Book a Court</h1>
        <div className="flex items-center space-x-2 sm:space-x-3">
            <span className="text-sm text-gray-600">Viewing:</span>
            <select 
                value={calendarView} 
                onChange={(e) => setCalendarView(e.target.value)}
                className="form-input py-1.5 px-2 text-sm rounded-md"
            >
                <option value="day">Day View</option>
                {/* <option value="week">Week View</option> */} {/* Week view can be added later */}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filters and Date Picker - Sidebar on larger screens */}
        <div className="lg:col-span-3 space-y-6">
            <div className="card">
                <div className="card-body">
                    <label htmlFor="date-picker" className="form-label flex items-center mb-1.5">
                        <Calendar className="h-4 w-4 mr-2 text-primary-600" /> Select Date
                    </label>
                    <DatePicker
                        id="date-picker"
                        selected={selectedDate}
                        onChange={handleDateChange}
                        dateFormat="EEEE, MMMM d, yyyy"
                        minDate={minBookingDate}
                        maxDate={maxBookingDate}
                        className="form-input w-full"
                        inline // Show inline calendar
                    />
                </div>
            </div>
            <div className="card">
                <div className="card-body">
                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                        <Filter className="h-4 w-4 mr-2 text-primary-600"/> Filters
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="court-type" className="form-label text-sm">Court Type</label>
                            <select 
                                id="court-type"
                                value={filters.type}
                                onChange={(e) => setFilters({...filters, type: e.target.value})}
                                className="form-input w-full text-sm"
                            >
                                <option value="">All Types</option>
                                <option value="indoor">Indoor</option>
                                <option value="outdoor">Outdoor</option>
                                <option value="covered">Covered</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="court-surface" className="form-label text-sm">Court Surface</label>
                            <select 
                                id="court-surface"
                                value={filters.surface}
                                onChange={(e) => setFilters({...filters, surface: e.target.value})}
                                className="form-input w-full text-sm"
                            >
                                <option value="">All Surfaces</option>
                                <option value="hard">Hard</option>
                                <option value="clay">Clay</option>
                                <option value="grass">Grass</option>
                                <option value="synthetic">Synthetic</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Calendar View - Main area */}
        <div className="lg:col-span-9">
          {isLoadingCourts && (
            <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-lg shadow">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-600">Loading court schedule...</p>
            </div>
          )}
          {!isLoadingCourts && courtsError && (
            <div className="card bg-error-50 h-[500px] flex flex-col items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-error-500 mb-3"/>
                <p className="font-semibold text-error-700">Could not load schedule.</p>
                <p className="text-sm text-error-600">{courtsError.message || "Please try again later."}</p>
            </div>
          )}
          {!isLoadingCourts && !courtsError && (
            <div className="card p-0 sm:p-0 md:p-0 lg:p-0 h-[calc(100vh-12rem)] sm:h-[calc(100vh-10rem)] md:h-[600px] lg:h-[700px]"> {/* Adjusted height */}
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }} // Make calendar fill its container
                view={calendarView}
                views={['day']} // Only day view for now
                onView={(view) => setCalendarView(view)}
                date={selectedDate}
                onNavigate={handleCalendarNavigate}
                onSelectEvent={handleSelectEvent}
                selectable={true} // Allows clicking on empty slots if onSelectSlot is handled
                // onSelectSlot={handleSelectEmptySlot} // For booking by dragging, more complex
                min={minTime}
                max={maxTime}
                step={30} // Controls the time grid lines (e.g., every 30 minutes)
                timeslots={2} // Number of slots in each step (e.g., 2 slots per 30 min = 15 min increments in grid)
                               // Since our slots are 60 min, step 60 and timeslots 1 would be fine too.
                               // Or step 30 and timeslots 2 if you want finer grid lines.
                               // Backend already generates 60 min slots.
                eventPropGetter={eventStyleGetter}
                components={{
                    toolbar: (toolbar) => ( // Custom Toolbar for cleaner navigation
                        <div className="rbc-toolbar p-3 border-b">
                            <span className="rbc-btn-group">
                                <button type="button" onClick={() => toolbar.onNavigate('PREV')}>Prev</button>
                                <button type="button" onClick={() => toolbar.onNavigate('TODAY')}>Today</button>
                                <button type="button" onClick={() => toolbar.onNavigate('NEXT')}>Next</button>
                            </span>
                            <span className="rbc-toolbar-label font-semibold text-lg text-gray-700">
                                {toolbar.label}
                            </span>
                            <span className="rbc-btn-group">
                                {/* View switcher can go here if more views are added */}
                            </span>
                        </div>
                    ),
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Confirm Your Booking" size="lg">
        {selectedSlotDetails && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-semibold text-primary-700">{selectedSlotDetails.courtName}</h3>
              <p className="text-sm text-gray-500">
                {selectedSlotDetails.courtType} • {selectedSlotDetails.courtSurface}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Date:</p>
                <p className="text-gray-800">{format(parseISO(selectedSlotDetails.date + "T00:00:00.000Z"), 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Time:</p>
                <p className="text-gray-800">{selectedSlotDetails.startTime} - {selectedSlotDetails.endTime} (60 min)</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Estimated Price:</p>
                <p className="text-gray-800 text-lg font-semibold">€{calculateSlotPrice()}</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
                <label className="form-label text-md font-medium text-gray-800">Players</label>
                {playerNames.map((player, index) => (
                    <div key={index} className="flex items-center space-x-2 group">
                        <input 
                            type="text"
                            placeholder={`Player ${index + 1} Name`}
                            value={player.name}
                            onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                            className="form-input flex-grow text-sm"
                            disabled={index === 0 && !player.isGuest}
                        />
                        <input 
                            type="email"
                            placeholder="Email (Optional)"
                            value={player.email}
                            onChange={(e) => handlePlayerChange(index, 'email', e.target.value)}
                            className="form-input flex-grow text-sm"
                            disabled={index === 0 && !player.isGuest}
                        />
                        {index > 0 && (
                             <button type="button" onClick={() => handleRemovePlayer(index)} className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 className="h-4 w-4"/>
                            </button>
                        )}
                    </div>
                ))}
                {playerNames.length < 4 && (
                    <button type="button" onClick={handleAddPlayer} className="btn-secondary btn-sm text-xs flex items-center">
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5"/> Add Player
                    </button>
                )}
            </div>

            <div>
                <label htmlFor="bookingNotes" className="form-label text-md font-medium text-gray-800">Notes (Optional)</label>
                <textarea 
                    id="bookingNotes"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="form-input w-full text-sm"
                    rows="2"
                    placeholder="Any specific requests or notes..."
                ></textarea>
            </div>

            <div className="pt-3 flex justify-end space-x-3">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="btn-secondary" disabled={createBookingMutation.isLoading}>Cancel</button>
              <button type="button" onClick={handleConfirmBooking} className="btn-primary" disabled={createBookingMutation.isLoading}>
                {createBookingMutation.isLoading ? 'Booking...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookCourt;