import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminLayout from './AdminLayout'

const AdminRoute = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

export default AdminRoute
