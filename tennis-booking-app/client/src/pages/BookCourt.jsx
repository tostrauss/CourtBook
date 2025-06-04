import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMyBookings } from '../hooks/useBookings'
import { useCourts } from '../hooks/useCourts'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { Calendar, Clock, Activity, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react'
import { format, isFuture, isToday, startOfToday } from 'date-fns'
import LoadingSpinner from '../components/common/LoadingSpinner'

const Dashboard = () => {
  const { user } = useAuth()
  const { data: bookingsData, isLoading: bookingsLoading } = useMyBookings({ 
    status: 'confirmed',
    startDate: startOfToday().toISOString()
  })
  const { data: courtsData, isLoading: courtsLoading } = useCourts()
  const { data: announcementsData } = useAnnouncements({ limit: 5 })

  const upcomingBookings = bookingsData?.data || []
  const todaysBookings = upcomingBookings.filter(booking => isToday(new Date(booking.date)))
  const futureBookings = upcomingBookings.filter(booking => isFuture(new Date(booking.date)) && !isToday(new Date(booking.date)))

  const stats = [
    {
      title: 'Total Bookings',
      value: bookingsData?.count || 0,
      icon: Calendar,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      title: "Today's Bookings",
      value: todaysBookings.length,
      icon: Clock,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    },
    {
      title: 'Available Courts',
      value: courtsData?.data?.filter(court => court.isActive).length || 0,
      icon: Activity,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
    },
    {
      title: 'Upcoming',
      value: futureBookings.length,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ]

  if (bookingsLoading || courtsLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.firstName || user.username}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your tennis court bookings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Bookings */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h2>
                <Link to="/my-bookings" className="text-sm text-primary-600 hover:text-primary-700">
                  View all
                </Link>
              </div>
            </div>
            <div className="card-body">
              {upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.slice(0, 5).map((booking) => (
                    <div key={booking._id} className="border-l-4 border-primary-500 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{booking.court.name}</h4>
                          <p className="text-sm text-gray-600">
                            {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.startTime} - {booking.endTime}
                          </p>
                        </div>
                        <Link
                          to={`/bookings/${booking._id}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No upcoming bookings</p>
                  <Link to="/book-court" className="btn-primary">
                    Book a Court
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Announcements */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
                <Link to="/announcements" className="text-sm text-primary-600 hover:text-primary-700">
                  View all
                </Link>
              </div>
            </div>
            <div className="card-body">
              {announcementsData?.data?.length > 0 ? (
                <div className="space-y-4">
                  {announcementsData.data.map((announcement) => (
                    <div key={announcement._id} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                      <div className="flex items-start space-x-3">
                        {announcement.type === 'urgent' && (
                          <AlertCircle className="h-5 w-5 text-error-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {announcement.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {format(new Date(announcement.publishDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No announcements</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card mt-6">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="card-body space-y-3">
              <Link to="/book-court" className="btn-primary w-full">
                Book a Court
              </Link>
              <Link to="/courts" className="btn-outline w-full">
                View Available Courts
              </Link>
              <Link to="/profile" className="btn-secondary w-full">
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
