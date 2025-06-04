import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import authService from '../services/authService'

const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('')
  
  const token = searchParams.get('token')
  
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setErrorMessage('Invalid verification link')
        return
      }
      
      try {
        await authService.verifyEmail(token)
        setStatus('success')
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } catch (error) {
        setStatus('error')
        setErrorMessage(
          error.response?.data?.message || 'Email verification failed'
        )
      }
    }
    
    verifyEmail()
  }, [token, navigate])
  
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {status === 'verifying' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
              <Loader className="h-6 w-6 text-primary-600 animate-spin" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Verifying your email
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success-100">
              <CheckCircle className="h-6 w-6 text-success-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Email verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email has been successfully verified.
            </p>
            <p className="mt-4 text-sm text-gray-600">
              You will be redirected to the login page in a few seconds...
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Go to login now
              </Link>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error-100">
              <XCircle className="h-6 w-6 text-error-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Verification failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {errorMessage}
            </p>
            <p className="mt-4 text-sm text-gray-600">
              The verification link may be invalid or expired.
            </p>
            <div className="mt-6 space-x-4">
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Go to login
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Register again
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail