import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Lazy load pages for better performance
const Home = React.lazy(() => import('./pages/Home'))
const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'))
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const BookCourt = React.lazy(() => import('./pages/BookCourt'))
const MyBookings = React.lazy(() => import('./pages/MyBookings'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Courts = React.lazy(() => import('./pages/Courts'))
const Announcements = React.lazy(() => import('./pages/Announcements'))

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'))
const AdminUsers = React.lazy(() => import('./pages/admin/Users'))
const AdminCourts = React.lazy(() => import('./pages/admin/Courts'))
const AdminBookings = React.lazy(() => import('./pages/admin/Bookings'))
const AdminAnnouncements = React.lazy(() => import('./pages/admin/Announcements'))

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    }>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
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
          <Route path="admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="courts" element={<AdminCourts />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </React.Suspense>
  )
}