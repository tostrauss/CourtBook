import React, { useState } from 'react'
import { User, Mail, Phone, Calendar, Shield, Save, Key } from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useAuth } from '../context/AuthContext'
import userService from '../services/userService'
import { toast } from 'react-toastify'

const profileSchema = yup.object({
  firstName: yup.string(),
  lastName: yup.string(),
  phoneNumber: yup.string(),
  emailNotifications: yup.boolean(),
  smsNotifications: yup.boolean(),
  reminderTime: yup.number().min(0).max(1440)
})

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/\d/, 'Password must contain at least one number'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
})

const Profile = () => {
  const { user, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty }
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
      emailNotifications: user?.preferences?.emailNotifications ?? true,
      smsNotifications: user?.preferences?.smsNotifications ?? false,
      reminderTime: user?.preferences?.reminderTime || 60
    }
  })
  
  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword
  } = useForm({
    resolver: yupResolver(passwordSchema)
  })
  
  const onSubmitProfile = async (data) => {
    setIsUpdating(true)
    try {
      const updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        preferences: {
          emailNotifications: data.emailNotifications,
          smsNotifications: data.smsNotifications,
          reminderTime: data.reminderTime
        }
      }
      
      const result = await updateProfile(updateData)
      if (result.success) {
        toast.success('Profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }
  
  const onSubmitPassword = async (data) => {
    setIsUpdating(true)
    try {
      await userService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      toast.success('Password updated successfully')
      resetPassword()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password')
    } finally {
      setIsUpdating(false)
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
      
      {/* User Info Card */}
      <div className="card mb-8">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-600">
                  {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.fullName || user?.username}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {user?.email}
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-1" />
                  {user?.role === 'admin' ? 'Administrator' : 'Member'}
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {format(new Date(user?.createdAt || Date.now()), 'MMM yyyy')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preferences'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Preferences
          </button>
        </nav>
      </div>
      
      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">
                    <User className="inline h-4 w-4 mr-1" />
                    First Name
                  </label>
                  <input
                    {...registerProfile('firstName')}
                    className="form-input"
                    placeholder="John"
                  />
                  {profileErrors.firstName && (
                    <p className="form-error">{profileErrors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">
                    <User className="inline h-4 w-4 mr-1" />
                    Last Name
                  </label>
                  <input
                    {...registerProfile('lastName')}
                    className="form-input"
                    placeholder="Doe"
                  />
                  {profileErrors.lastName && (
                    <p className="form-error">{profileErrors.lastName.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    {...registerProfile('phoneNumber')}
                    className="form-input"
                    placeholder="+1 (555) 123-4567"
                  />
                  {profileErrors.phoneNumber && (
                    <p className="form-error">{profileErrors.phoneNumber.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="form-label">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="form-input bg-gray-50"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isProfileDirty || isUpdating}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6 max-w-md">
              <div>
                <label className="form-label">
                  <Key className="inline h-4 w-4 mr-1" />
                  Current Password
                </label>
                <input
                  {...registerPassword('currentPassword')}
                  type="password"
                  className="form-input"
                />
                {passwordErrors.currentPassword && (
                  <p className="form-error">{passwordErrors.currentPassword.message}</p>
                )}
              </div>
              
              <div>
                <label className="form-label">
                  <Key className="inline h-4 w-4 mr-1" />
                  New Password
                </label>
                <input
                  {...registerPassword('newPassword')}
                  type="password"
                  className="form-input"
                />
                {passwordErrors.newPassword && (
                  <p className="form-error">{passwordErrors.newPassword.message}</p>
                )}
              </div>
              
              <div>
                <label className="form-label">
                  <Key className="inline h-4 w-4 mr-1" />
                  Confirm New Password
                </label>
                <input
                  {...registerPassword('confirmPassword')}
                  type="password"
                  className="form-input"
                />
                {passwordErrors.confirmPassword && (
                  <p className="form-error">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-primary"
                >
                  {isUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      {...registerProfile('emailNotifications')}
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Email notifications for bookings and announcements
                    </span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      {...registerProfile('smsNotifications')}
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      SMS notifications for bookings (requires phone number)
                    </span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="form-label">
                  Booking reminder time (minutes before)
                </label>
                <select
                  {...registerProfile('reminderTime')}
                  className="form-input max-w-xs"
                >
                  <option value={0}>No reminder</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={1440}>1 day</option>
                </select>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isProfileDirty || isUpdating}
                  className="btn-primary flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile