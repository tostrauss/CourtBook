import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Corrected import path for AdminLayout
import AdminLayout from '../components/layout/AdminLayout'; // Go up one level, then into components/layout

const AdminRoute = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-600"></div>
        <p className="ml-3 text-gray-700">Loading Admin Access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // If the user is authenticated but not an admin, redirect them.
    // Redirecting to the user dashboard is a common pattern.
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and is an admin, render the AdminLayout with the nested routes
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export default AdminRoute;
