import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
// Corrected import paths:
import Layout from './components/layout/MainLayout'; // Corrected path and name
import ProtectedRoute from './routes/ProtectedRoute'; // Corrected path
import AdminRoute from './routes/AdminRoute';       // Corrected path

// Lazy load pages for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const BookCourt = React.lazy(() => import('./pages/BookCourt'));
const MyBookings = React.lazy(() => import('./pages/MyBookings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Courts = React.lazy(() => import('./pages/Courts'));
const Announcements = React.lazy(() => import('./pages/Announcements'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/ADashboard.jsx'));
const AdminUsers = React.lazy(() => import('./pages/admin/Users'));
const AdminCourts = React.lazy(() => import('./pages/admin/Courts'));
const AdminBookings = React.lazy(() => import('./pages/admin/Bookings'));
const AdminAnnouncements = React.lazy(() => import('./pages/admin/Announcements'));

// A simple NotFound component (can be moved to its own file later)
const NotFoundPage = () => (
  <div className="text-center py-20">
    <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
    <p className="text-lg">Sorry, the page you are looking for does not exist.</p>
    <Link to="/" className="mt-6 inline-block px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700">
      Go Home
    </Link>
  </div>
);


function App() {
  const { user, loading } = useAuth(); // Assuming useAuth provides loading state

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* You can use your LoadingSpinner component here if you prefer */}
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
        <p className="ml-4 text-lg text-gray-700">Loading Application...</p>
      </div>
    );
  }

  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600"></div>
        <p className="ml-4 text-lg text-gray-700">Loading Page...</p>
      </div>
    }>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout />}> {/* MainLayout will render here */}
          <Route index element={<Home />} />
          <Route path="login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="courts" element={<Courts />} />
          <Route path="announcements" element={<Announcements />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="book-court" element={<BookCourt />} />
            <Route path="my-bookings" element={<MyBookings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* Admin routes */}
          {/* AdminRoute itself includes AdminLayout, so Layout doesn't need to wrap it directly if AdminLayout is standalone */}
          <Route path="admin" element={<AdminRoute />}> {/* AdminRoute handles its own layout */}
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="courts" element={<AdminCourts />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
          </Route>

          {/* Catch-all for 404 Not Found, should be within the main Layout if you want header/footer */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        
        {/* Fallback if no other route matches, though the above "*" should catch it */}
        {/* <Route path="*" element={<Navigate to="/" />} /> */} 
      </Routes>
    </React.Suspense>
  );
}

export default App;
