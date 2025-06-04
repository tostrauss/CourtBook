// client/src/pages/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import bookingService from '../services/bookingService';
import courtService from '../services/courtService';
import announcementService from '../services/announcementService';
import { Calendar as CalendarIcon, Clock, Activity, TrendingUp, ArrowRight, AlertTriangle, Bell, Edit3, ListChecks, Settings } from 'lucide-react'; // Added more icons
import { format, isToday, isFuture, startOfToday, parseISO } from 'date-fns';

// Common Components
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch upcoming bookings (confirmed, from today onwards)
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery(
    ['dashboardBookings', user?._id],
    () => bookingService.getMyBookings({ 
      status: 'confirmed',
      startDate: format(startOfToday(), 'yyyy-MM-dd'),
      limit: 5, // Show a few recent/upcoming
      sort: 'date,startTime' // Sort by date then time
    }),
    { enabled: !!user }
  );

  // Fetch court statistics
  const { data: courtsData, isLoading: courtsLoading } = useQuery(
    'dashboardCourts',
    () => courtService.getCourts({ isActive: true }) // Only active courts for user dashboard
  );

  // Fetch recent announcements
  const { data: announcementsData, isLoading: announcementsLoading } = useQuery(
    'dashboardAnnouncements',
    () => announcementService.getAnnouncements({ limit: 3, sort: '-publishDate' }) // Get latest 3 active announcements
  );

  const upcomingBookings = bookingsData?.data || [];
  const activeCourtsCount = courtsData?.data?.length || 0; // Count of active courts fetched
  const recentAnnouncements = announcementsData?.data || [];

  const stats = [
    {
      title: 'My Upcoming Bookings',
      value: upcomingBookings.filter(b => {
          const bookingDate = parseISO(`${b.date.substring(0,10)}T${b.startTime}:00`);
          return isFuture(bookingDate) || isToday(bookingDate);
      }).length,
      icon: CalendarIcon,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      link: '/my-bookings'
    },
    {
      title: "Today's Bookings",
      value: upcomingBookings.filter(b => isToday(parseISO(`${b.date.substring(0,10)}T${b.startTime}:00`))).length,
      icon: Clock,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      link: '/my-bookings?tab=upcoming' // Link to upcoming tab
    },
    {
      title: 'Active Courts Available',
      value: activeCourtsCount,
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/courts'
    },
    {
      title: 'Recent Announcements',
      value: recentAnnouncements.length,
      icon: Bell,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      link: '/announcements'
    },
  ];

  const quickActions = [
    { title: 'Book a New Court', link: '/book-court', icon: CalendarIcon, variant: 'primary' },
    { title: 'View My Bookings', link: '/my-bookings', icon: ListChecks, variant: 'secondary' },
    { title: 'Update My Profile', link: '/profile', icon: Edit3, variant: 'secondary' },
  ];

  if (bookingsLoading || courtsLoading || announcementsLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  const getInitials = (firstName, lastName, username) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`;
    if (firstName) return firstName[0];
    if (username) return username[0];
    return 'U';
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-10 p-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl shadow-lg text-white">
        <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-white text-primary-600 flex items-center justify-center text-2xl font-semibold shadow">
                {getInitials(user.firstName, user.lastName, user.username).toUpperCase()}
              </div>
            </div>
            <div>
                <h1 className="text-3xl font-bold">
                Welcome back, {user.firstName || user.username}!
                </h1>
                <p className="mt-1 text-primary-100">
                Here's your tennis dashboard at a glance.
                </p>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow" onClick={() => stat.link && document.getElementById(`stat-link-${stat.title.replace(/\s+/g, '-')}`)?.click()}>
            <Link to={stat.link || '#'} id={`stat-link-${stat.title.replace(/\s+/g, '-')}`} className="focus:outline-none" aria-label={`View ${stat.title}`}>
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                </div>
                {stat.link && (
                    <div className="mt-3 text-xs text-primary-600 hover:text-primary-700 flex items-center">
                        View Details <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                )}
            </Link>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Bookings Section */}
        <div className="lg:col-span-2">
          <Card
            header={<h2 className="text-xl font-semibold text-gray-800">My Upcoming Bookings</h2>}
            footer={
              upcomingBookings.length > 0 && (
                <div className="text-right">
                  <Button as={Link} to="/my-bookings" variant="link" size="sm">
                    View All My Bookings <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )
            }
          >
            {upcomingBookings.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {upcomingBookings.slice(0, 3).map((booking) => ( // Show top 3
                  <div key={booking._id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start">
                      <div>
                        <h4 className="font-medium text-primary-700">{booking.court.name}</h4>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`), 'EEEE, MMM d')} at {booking.startTime}
                        </p>
                      </div>
                      <span className={`mt-2 sm:mt-0 badge text-xs ${isToday(parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`)) ? 'badge-warning' : 'badge-primary'}`}>
                        {isToday(parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`)) ? 'Today' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">You have no upcoming bookings.</p>
                <Button as={Link} to="/book-court" variant="primary" icon={CalendarIcon}>
                  Book a Court
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions & Announcements Column */}
        <div className="space-y-8">
            {/* Quick Actions */}
            <Card header={<h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>}>
                <div className="space-y-3">
                {quickActions.map(action => (
                    <Button
                        key={action.title}
                        as={Link}
                        to={action.link}
                        variant={action.variant || "secondary"}
                        icon={action.icon}
                        fullWidth
                        className="justify-start text-left"
                    >
                        {action.title}
                    </Button>
                ))}
                </div>
            </Card>

            {/* Recent Announcements Section */}
            <Card header={<h2 className="text-xl font-semibold text-gray-800">Recent Announcements</h2>}
                footer={
                    recentAnnouncements.length > 0 && (
                        <div className="text-right">
                        <Button as={Link} to="/announcements" variant="link" size="sm">
                            View All Announcements <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                        </div>
                    )
                }
            >
                {recentAnnouncements.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {recentAnnouncements.map((announcement) => (
                    <div key={announcement._id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="flex items-start space-x-2.5">
                        {announcement.type === 'urgent' && (
                            <AlertTriangle className="h-5 w-5 text-error-500 flex-shrink-0 mt-0.5" />
                        )}
                        {announcement.type === 'warning' && (
                            <AlertTriangle className="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
                        )}
                        {(!announcement.type || announcement.type === 'info') && (
                            <Info className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-800">{announcement.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {announcement.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-1.5">
                            {format(parseISO(announcement.publishDate), 'MMM d, yyyy')}
                            </p>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                ) : (
                <div className="text-center py-8">
                    <Bell className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No recent announcements.</p>
                </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
