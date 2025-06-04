import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock,
  DollarSign,
  AlertCircle,
  ChevronRight 
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth } from 'date-fns'
import { useQuery } from 'react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import bookingService from '../../services/bookingService'
import userService from '../../services/userService'
import courtService from '../../services/courtService'

const AdminDashboard = () => {
  // Fetch statistics
  const { data: stats, isLoading } = useQuery('adminStats', async () => {
    const [users, courts, todayBookings, weekBookings, monthBookings] = await Promise.all([
      userService.getAllUsers({ limit: 1 }),
      courtService.getCourts(),
      bookingService.getAllBookings({ 
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        status: 'confirmed'
      }),
      bookingService.getAllBookings({ 
        startDate: startOfWeek(new Date()).toISOString(),
        endDate: endOfWeek(new Date()).toISOString(),
        status: 'confirmed'
      }),
      bookingService.getAllBookings({ 
        startDate: startOfMonth(new Date()).toISOString(),
        status: 'confirmed',
        limit: 100
      })
    ])
    
    return {
      totalUsers: users.count || 0,
      totalCourts: courts.data?.length || 0,
      activeCourts: courts.data?.filter(c => c.isActive).length || 0,
      todayBookings: todayBookings.count || 0,
      weekBookings: weekBookings.count || 0,
      monthBookings: monthBookings.data || []
    }
  })
  
  // Process monthly bookings for chart
  const bookingsByDay = React.useMemo(() => {
    if (!stats?.monthBookings) return []
    
    const grouped = stats.monthBookings.reduce((acc, booking) => {
      const date = format(new Date(booking.date), 'MMM d')
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
    
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, bookings: count }))
      .slice(-7) // Last 7 days
  }, [stats])
  
  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
      link: '/admin/users'
    },
    {
      title: 'Active Courts',
      value: `${stats?.activeCourts || 0}/${stats?.totalCourts || 0}`,
      icon: Activity,
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      link: '/admin/courts'
    },
    {
      title: "Today's Bookings",
      value: stats?.todayBookings || 0,
      icon: Calendar,
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      link: '/admin/bookings'
    },
    {
      title: 'This Week',
      value: stats?.weekBookings || 0,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      link: '/admin/bookings'
    }
  ]
  
  const quickActions = [
    { title: 'Manage Users', link: '/admin/users', icon: Users },
    { title: 'Manage Courts', link: '/admin/courts', icon: Activity },
    { title: 'View Bookings', link: '/admin/bookings', icon: Calendar },
    { title: 'Announcements', link: '/admin/announcements', icon: AlertCircle }
  ]
  
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <Link key={index} to={stat.link} className="card hover:shadow-lg transition-shadow">
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
          </Link>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking Trends */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Booking Trends (Last 7 Days)</h2>
          </div>
          <div className="card-body">
            {bookingsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bookingsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-500">
                No booking data available
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <action.icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">{action.title}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="card mt-8">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
            <Link to="/admin/bookings" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Court</th>
                  <th className="table-header-cell">Date</th>
                  <th className="table-header-cell">Time</th>
                  <th className="table-header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {stats?.monthBookings?.slice(0, 5).map((booking) => (
                  <tr key={booking._id}>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{booking.user.firstName} {booking.user.lastName}</div>
                        <div className="text-xs text-gray-500">{booking.user.email}</div>
                      </div>
                    </td>
                    <td className="table-cell">{booking.court.name}</td>
                    <td className="table-cell">{format(new Date(booking.date), 'MMM d, yyyy')}</td>
                    <td className="table-cell">{booking.startTime} - {booking.endTime}</td>
                    <td className="table-cell">
                      <span className={`badge ${booking.status === 'confirmed' ? 'badge-success' : 'badge-error'}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard