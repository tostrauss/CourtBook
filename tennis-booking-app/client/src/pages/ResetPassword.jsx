import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import authService from '../services/authService'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-toastify'

const schema = yup.object({
  password: yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/\d/, 'Password must contain at least one number'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match')
})

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInvalidToken, setIsInvalidToken] = useState(false)
  
  const token = searchParams.get('token')
  
  useEffect(() => {
    if (!token) {
      setIsInvalidToken(true)
    }
  }, [token])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm({
    resolver: yupResolver(schema)
  })
  
  const onSubmit = async (data) => {
    if (!token) {
      setError('root', { message: 'Invalid reset link' })
      return
    }
    
    setIsLoading(true)
    try {
      const response = await authService.resetPassword(token, data.password)
      
      if (response.data?.accessToken) {
        // Auto-login after password reset
        toast.success('Password reset successful! You are now logged in.')
        navigate('/dashboard')
      } else {
        toast.success('Password reset successful! Please log in with your new password.')
        navigate('/login')
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setIsInvalidToken(true)
      }
      setError('root', { 
        message: error.response?.data?.message || 'Failed to reset password' 
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  if (isInvalidToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100">
              <XCircle className="h-6 w-6 text-error-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Invalid or Expired Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This password reset link is invalid or has expired.
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Please request a new password reset link.
            </p>
            <div className="mt-6 space-x-4">
              <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Request new link
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          
          {errors.root && (
            <div className="rounded-md bg-error-50 p-4">
              <p className="text-sm text-error-800">{errors.root.message}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
            
            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
                Back to login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword