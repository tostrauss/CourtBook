// client/src/pages/admin/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar as CalendarIcon, // Renamed to avoid conflict with BigCalendar
  Activity, 
  TrendingUp, 
  Bell, // For Announcements
  Settings, // For general settings or other links
  BarChart2, // For charts
  ChevronRight
} from 'lucide-react';
import { useQuery } from 'react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Added Legend
import { format, startOfWeek, endOfWeek, startOfMonth, eachDayOfInterval, subDays } from 'date-fns';

// Services
import userService from '../../services/userService';
import courtService from '../../services/courtService';
import bookingService from '../../services/bookingService';
import announcementService from '../../services/announcementService';

// Common Components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  // Fetch statistics
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery('adminDashboardStats', async () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);

    const [
      usersData, 
      courtsData, 
      todayBookingsData, 
      weekBookingsData, 
      recentBookingsData, // For recent activity table
      announcementsData
    ] = await Promise.all([
      userService.getAllUsers({ limit: 1, page: 1 }), // To get total count
      courtService.getCourts({ showInactive: 'true' }), // Get all courts to count active/total
      bookingService.getAllBookings({ 
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
        status: 'confirmed' 
      }),
      bookingService.getAllBookings({ 
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
        status: 'confirmed'
      }),
      bookingService.getAllBookings({ limit: 5, sort: '-createdAt' }), // Last 5 bookings created
      announcementService.getAnnouncements({ limit: 1, isActive: 'all' }) // To get total announcements count
    ]);
    
    // Process bookings for chart (last 7 days)
    const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
    const bookingsForChartPromises = last7Days.map(day => 
        bookingService.getAllBookings({
            startDate: format(day, 'yyyy-MM-dd'),
            endDate: format(day, 'yyyy-MM-dd'),
            status: 'confirmed' // Or all statuses if preferred for trend
        })
    );
    const bookingsForChartResponses = await Promise.all(bookingsForChartPromises);
    const bookingsByDay = last7Days.map((day, index) => ({
        date: format(day, 'MMM d'),
        bookings: bookingsForChartResponses[index]?.count || 0,
    }));

    return {
      totalUsers: usersData?.count || 0,
      totalCourts: courtsData?.data?.length || 0,
      activeCourts: courtsData?.data?.filter(c => c.isActive).length || 0,
      todayBookingsCount: todayBookingsData?.count || 0,
      weekBookingsCount: weekBookingsData?.count || 0,
      totalAnnouncements: announcementsData?.count || 0,
      recentBookings: recentBookingsData?.data || [],
      bookingsByDayChartData: bookingsByDay,
    };
  });
  
  const statCardsData = [
    { title: 'Total Users', value: stats?.totalUsers, icon: Users, link: '/admin/users', color: 'text-sky-600', bgColor: 'bg-sky-50' },
    { title: 'Active Courts', value: `${stats?.activeCourts || 0} / ${stats?.totalCourts || 0}`, icon: Activity, link: '/admin/courts', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: "Today's Bookings", value: stats?.todayBookingsCount, icon: CalendarIcon, link: '/admin/bookings', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { title: 'Total Announcements', value: stats?.totalAnnouncements, icon: Bell, link: '/admin/announcements', color: 'text-rose-600', bgColor: 'bg-rose-50' }
  ];
  
  const quickActions = [
    { title: 'Manage Users', link: '/admin/users', icon: Users },
    { title: 'Manage Courts', link: '/admin/courts', icon: CalendarIcon }, // Changed icon for variety
    { title: 'View All Bookings', link: '/admin/bookings', icon: TrendingUp }, // Changed icon
    { title: 'Manage Announcements', link: '/admin/announcements', icon: Bell }
  ];
  
  if (isLoadingStats) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-gray-600">Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (statsError) {
    return (
        <Card className="bg-error-50 border-error-200">
            <div className="card-body text-center text-error-700 py-10">
                <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-error-400"/>
                <p className="font-semibold">Could not load dashboard statistics.</p>
                <p className="text-sm">{(statsError).message || "Please try refreshing the page."}</p>
            </div>
        </Card>
    );
  }
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCardsData.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-200">
            <Link to={stat.link} className="block p-5 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value ?? 'N/A'}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 text-xs text-primary-600 hover:text-primary-700 flex items-center">
                Go to section <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </Link>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Trends Chart */}
        <div className="lg:col-span-2">
            <Card header={<h2 className="text-xl font-semibold text-gray-800 flex items-center"><BarChart2 className="h-5 w-5 mr-2 text-primary-600"/>Booking Trends (Last 7 Days)</h2>}>
            {stats?.bookingsByDayChartData && stats.bookingsByDayChartData.length > 0 ? (
              <div className="h-80 py-4 pr-2"> {/* Added padding for better axis visibility */}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.bookingsByDayChartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}> {/* Adjusted margins */}
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280"/>
                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" allowDecimals={false}/>
                    <Tooltip wrapperClassName="rounded-md shadow-lg" contentStyle={{backgroundColor: 'white', border: 'none', borderRadius: '0.5rem'}}/>
                    <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                    <Bar dataKey="bookings" fill="#4f46e5" name="Confirmed Bookings" barSize={20} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                No booking data available for the chart.
              </div>
            )}
          </Card>
        </div>
        
        {/* Quick Actions */}
        <div>
          <Card header={<h2 className="text-xl font-semibold text-gray-800 flex items-center"><Settings className="h-5 w-5 mr-2 text-primary-600"/>Quick Actions</h2>}>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.title}
                  as={Link}
                  to={action.link}
                  variant="outline" // Changed to outline for less emphasis than primary stats
                  icon={action.icon}
                  fullWidth
                  className="justify-start text-left !border-gray-300 hover:!bg-gray-50 !text-gray-700"
                >
                  {action.title}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      
      {/* Recent Activity Table (e.g., Last 5 Bookings) */}
      <Card header={<h2 className="text-xl font-semibold text-gray-800">Recent Bookings Activity</h2>}
        footer={stats?.recentBookings?.length > 0 && 
            <div className="text-right">
                <Button as={Link} to="/admin/bookings" variant="link" size="sm">View All Bookings <ArrowRight className="h-4 w-4 ml-1"/></Button>
            </div>
        }
      >
        {stats?.recentBookings && stats.recentBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Court</th>
                  <th className="table-header-cell">Date & Time</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Created</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {stats.recentBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      {booking.user ? `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || booking.user.username : 'N/A'}
                    </td>
                    <td className="table-cell">{booking.court?.name || 'N/A'}</td>
                    <td className="table-cell">
                      {format(parseISO(`${booking.date.substring(0,10)}T${booking.startTime}:00`), 'MMM d, yyyy')} at {booking.startTime}
                    </td>
                    <td className="table-cell">
                      <span className={`badge text-xs capitalize ${
                        booking.status === 'confirmed' ? 'badge-success' :
                        booking.status === 'pending' ? 'badge-warning' :
                        booking.status === 'cancelled' ? 'badge-error' :
                        'badge-primary' // for completed, etc.
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500 text-xs">{format(parseISO(booking.createdAt), 'MMM d, HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-5">No recent booking activity.</p>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;