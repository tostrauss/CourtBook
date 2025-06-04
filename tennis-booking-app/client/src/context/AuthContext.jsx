import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import authService from '../services/authService'
import userService from '../services/userService'
import { toast } from 'react-toastify'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const userData = await userService.getMe()
        setUser(userData)
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('accessToken')
      }
    }
    setLoading(false)
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      setUser(response.data.user)
      toast.success('Registration successful! Please check your email to verify your account.')
      navigate('/dashboard')
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      }
    }
  }

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials)
      setUser(response.data.user)
      toast.success('Login successful!')
      
      // Redirect to intended page or dashboard
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('accessToken')
      toast.info('Logged out successfully')
      navigate('/')
    }
  }

  const updateProfile = async (userData) => {
    try {
      const updatedUser = await userService.updateMe(userData)
      setUser(updatedUser)
      toast.success('Profile updated successfully')
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Update failed' 
      }
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    register,
    login,
    logout,
    updateProfile,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
