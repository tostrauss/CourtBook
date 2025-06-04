// client/src/pages/Profile.jsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Calendar as CalendarIcon, Shield, Save, Key, Bell, Settings } from 'lucide-react'; // Renamed Calendar to CalendarIcon
import { format } from 'date-fns';

// Common Components
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner'; // For overall page loading if needed

const profileSchema = yup.object({
  firstName: yup.string().max(50, 'First name too long'),
  lastName: yup.string().max(50, 'Last name too long'),
  phoneNumber: yup.string().optional().matches(/^$|^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number format'),
});

const preferencesSchema = yup.object({
  emailNotifications: yup.boolean(),
  smsNotifications: yup.boolean(),
  reminderTime: yup.number().typeError('Must be a number').min(0).max(1440), // 0 for no reminder, 1440 for 1 day
});

const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/\d/, 'Password must contain at least one number')
    .notOneOf([yup.ref('currentPassword')], 'New password must be different from current password'),
  confirmPassword: yup.string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'New passwords must match'),
});

const Profile = () => {
  const { user, updateProfile, loading: authLoading, checkAuth } = useAuth(); // Added checkAuth
  const [activeTab, setActiveTab] = useState('profile');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [isPreferencesUpdating, setIsPreferencesUpdating] = useState(false);

  // Initialize forms
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
    reset: resetProfileForm,
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm({
    resolver: yupResolver(passwordSchema),
  });
  
  const {
    register: registerPreferences,
    handleSubmit: handleSubmitPreferences,
    formState: { errors: preferencesErrors, isDirty: isPreferencesDirty },
    reset: resetPreferencesForm,
  } = useForm({
    resolver: yupResolver(preferencesSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      reminderTime: 60,
    }
  });

  // Effect to populate forms once user data is available or changes
  useEffect(() => {
    if (user) {
      resetProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
      });
      resetPreferencesForm({
        emailNotifications: user.preferences?.emailNotifications ?? true,
        smsNotifications: user.preferences?.smsNotifications ?? false,
        reminderTime: user.preferences?.reminderTime ?? 60,
      });
    }
  }, [user, resetProfileForm, resetPreferencesForm]);


  const onSubmitProfile = async (data) => {
    setIsProfileUpdating(true);
    try {
      const result = await updateProfile({ // updateProfile in AuthContext handles user state
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
      }); 
      if (result.success) {
        toast.success('Profile information updated successfully!');
        // Form is reset via useEffect on user change
      } else {
        toast.error(result.error || 'Failed to update profile information.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred while updating profile.');
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const onSubmitPassword = async (data) => {
    setIsPasswordUpdating(true);
    try {
      await userService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password updated successfully!');
      resetPasswordForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const onSubmitPreferences = async (data) => {
    setIsPreferencesUpdating(true);
     try {
      const result = await updateProfile({ preferences: data }); // updateProfile in AuthContext
      if (result.success) {
        toast.success('Notification preferences updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update preferences.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred while updating preferences.');
    } finally {
      setIsPreferencesUpdating(false);
    }
  };
  
  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const getInitials = (firstName, lastName, username) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`;
    if (firstName) return firstName[0];
    if (username) return username[0];
    return 'U';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your profile, password, and notification settings.</p>
      </div>
      
      {/* User Info Header Card */}
      <Card className="mb-8 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-primary-500 text-white flex items-center justify-center text-4xl font-semibold">
              {getInitials(user.firstName, user.lastName, user.username).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-gray-800">
              {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.username}
            </h2>
            <div className="mt-1 flex items-center justify-center sm:justify-start space-x-4 text-sm text-gray-500">
              <span className="inline-flex items-center"><Mail className="h-4 w-4 mr-1.5" />{user.email}</span>
              <span className={`inline-flex items-center capitalize badge ${user.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                <Shield className="h-3.5 w-3.5 mr-1" />{user.role}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Joined: {format(new Date(user.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </Card>
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {[
            { name: 'Profile', id: 'profile', icon: User },
            { name: 'Password', id: 'password', icon: Key },
            { name: 'Notifications', id: 'preferences', icon: Bell },
          ].map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <tab.icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <Card header="Profile Information" className="animate-fade-in">
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  id="firstName"
                  label="First Name"
                  icon={User}
                  register={registerProfile('firstName')}
                  error={profileErrors.firstName?.message}
                  disabled={isProfileUpdating}
                />
                <Input
                  id="lastName"
                  label="Last Name"
                  icon={User}
                  register={registerProfile('lastName')}
                  error={profileErrors.lastName?.message}
                  disabled={isProfileUpdating}
                />
                <Input
                  id="phoneNumber"
                  type="tel"
                  label="Phone Number"
                  icon={Phone}
                  placeholder="+1 (555) 123-4567"
                  register={registerProfile('phoneNumber')}
                  error={profileErrors.phoneNumber?.message}
                  disabled={isProfileUpdating}
                />
                <Input
                  id="email_display" // Different ID for display-only email
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  value={user.email}
                  disabled // Always disabled
                  inputClassName="bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" isLoading={isProfileUpdating} disabled={!isProfileDirty || isProfileUpdating} icon={Save}>
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>
        )}
        
        {activeTab === 'password' && (
          <Card header="Change Password" className="animate-fade-in">
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6 max-w-lg">
              <Input
                id="currentPassword"
                type="password"
                label="Current Password"
                icon={Key}
                register={registerPassword('currentPassword')}
                error={passwordErrors.currentPassword?.message}
                disabled={isPasswordUpdating}
              />
              <Input
                id="newPassword"
                type="password"
                label="New Password"
                icon={Lock}
                register={registerPassword('newPassword')}
                error={passwordErrors.newPassword?.message}
                disabled={isPasswordUpdating}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                icon={Lock}
                register={registerPassword('confirmPassword')}
                error={passwordErrors.confirmPassword?.message}
                disabled={isPasswordUpdating}
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={isPasswordUpdating} disabled={isPasswordUpdating} icon={Save} variant="primary">
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'preferences' && (
          <Card header="Notification Preferences" className="animate-fade-in">
            <form onSubmit={handleSubmitPreferences(onSubmitPreferences)} className="space-y-6">
                <div className="space-y-4">
                    <label className="flex items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            {...registerPreferences('emailNotifications')}
                            className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            disabled={isPreferencesUpdating}
                        />
                        <span className="ml-3 text-sm text-gray-700">
                            Receive email notifications for bookings and important announcements.
                        </span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            {...registerPreferences('smsNotifications')}
                            className="h-5 w-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            disabled={isPreferencesUpdating || !user.phoneNumber} // Disable if no phone number
                        />
                        <span className="ml-3 text-sm text-gray-700">
                            Receive SMS notifications for booking reminders.
                            {!user.phoneNumber && <span className="text-xs text-gray-400 ml-1">(Phone number required)</span>}
                        </span>
                    </label>
                </div>
              
              <div>
                <label htmlFor="reminderTime" className="form-label">Booking Reminder Time</label>
                <select
                  id="reminderTime"
                  {...registerPreferences('reminderTime')}
                  className="form-input max-w-xs text-sm"
                  disabled={isPreferencesUpdating}
                >
                  <option value={0}>No reminder</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={1440}>1 day before</option>
                </select>
                {preferencesErrors.reminderTime && (
                  <p className="form-error">{preferencesErrors.reminderTime.message}</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" isLoading={isPreferencesUpdating} disabled={!isPreferencesDirty || isPreferencesUpdating} icon={Save}>
                  Save Preferences
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
