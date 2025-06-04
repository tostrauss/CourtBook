// client/src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, Calendar as AppIcon } from 'lucide-react'; // Renamed Calendar to AppIcon

// Common Components
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { toast } from 'react-toastify';

const schema = yup.object({
  firstName: yup.string().required('First name is required').max(50, 'First name too long'),
  lastName: yup.string().required('Last name is required').max(50, 'Last name too long'),
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  phoneNumber: yup.string().optional().matches(/^$|^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number format'), // Optional, but validate if present
  password: yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/\d/, 'Password must contain at least one number'),
  confirmPassword: yup.string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

const Register = () => {
  const { register: registerUserContext } = useAuth(); // Renamed to avoid conflict
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (formData) => {
    setIsLoading(true);
    setError('root', undefined);
    const { confirmPassword, ...userData } = formData; // Exclude confirmPassword

    try {
        const result = await registerUserContext(userData); // authContext register now returns {success, error}
        if (!result.success) {
            setError('root', { message: result.error || 'Registration failed. Please try again.' });
            toast.error(result.error || 'Registration failed. Please try again.');
        } else {
         // Navigation is handled by AuthContext's register method on success
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'An unexpected error occurred during registration.';
        setError('root', { message: errorMessage });
        toast.error(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full"> {/* Increased max-width for more fields */}
        <Card
          header={
            <div className="text-center">
               <Link to="/" className="inline-block mb-6">
                <AppIcon className="h-12 w-12 text-primary-600 mx-auto" />
              </Link>
              <h2 className="text-2xl font-bold text-gray-900">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Or{' '}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  sign in to an existing account
                </Link>
              </p>
            </div>
          }
          className="shadow-xl"
        >
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="firstName"
                label="First Name"
                icon={User}
                placeholder="John"
                register={register('firstName')}
                error={errors.firstName?.message}
                disabled={isLoading}
              />
              <Input
                id="lastName"
                label="Last Name"
                icon={User}
                placeholder="Doe"
                register={register('lastName')}
                error={errors.lastName?.message}
                disabled={isLoading}
              />
            </div>
            <Input
              id="username"
              label="Username"
              icon={User}
              placeholder="johndoe"
              register={register('username')}
              error={errors.username?.message}
              disabled={isLoading}
            />
            <Input
              id="email"
              type="email"
              label="Email Address"
              icon={Mail}
              placeholder="you@example.com"
              register={register('email')}
              error={errors.email?.message}
              disabled={isLoading}
            />
            <Input
              id="phoneNumber"
              type="tel"
              label="Phone Number (Optional)"
              icon={Phone}
              placeholder="+1 (555) 123-4567"
              register={register('phoneNumber')}
              error={errors.phoneNumber?.message}
              disabled={isLoading}
            />
            <Input
              id="password"
              type="password"
              label="Password"
              icon={Lock}
              placeholder="••••••••"
              register={register('password')}
              error={errors.password?.message}
              disabled={isLoading}
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              icon={Lock}
              placeholder="••••••••"
              register={register('confirmPassword')}
              error={errors.confirmPassword?.message}
              disabled={isLoading}
            />

            {errors.root && (
              <div className="rounded-md bg-error-50 p-3">
                <p className="text-sm text-error-700">{errors.root.message}</p>
              </div>
            )}
            
            <div className="text-xs text-gray-500 pt-1">
                By registering, you agree to our{' '}
                <Link to="/terms" className="font-medium text-primary-600 hover:underline">Terms of Service</Link> and {' '}
                <Link to="/privacy" className="font-medium text-primary-600 hover:underline">Privacy Policy</Link>.
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
              size="lg"
            >
              Create account
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register;
