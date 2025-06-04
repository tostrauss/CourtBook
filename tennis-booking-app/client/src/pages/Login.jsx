// client/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../context/AuthContext';
// Corrected icon import
import { Mail, Lock, Calendar } from 'lucide-react';

// Common Components
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { toast } from 'react-toastify';

const schema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('root', undefined);
    try {
      const result = await login(data);
      if (!result.success) {
        setError('root', { message: result.error || 'Login failed. Please check your credentials.' });
        toast.error(result.error || 'Login failed. Please check your credentials.');
      } else {
        // Navigation is handled by AuthContext's login method on success
        // It will use location.state.from or default to /dashboard
      }
    } catch (error) {
        const errorMessage = error.response?.data?.message || 'An unexpected error occurred during login.';
        setError('root', { message: errorMessage });
        toast.error(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card
          header={
            <div className="text-center">
              <Link to="/" className="inline-block mb-6">
                {/* Calendar icon is used here */}
                <Calendar className="h-12 w-12 text-primary-600 mx-auto" />
              </Link>
              <h2 className="text-2xl font-bold text-gray-900">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Or{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  create a new account
                </Link>
              </p>
            </div>
          }
          className="shadow-xl"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="email"
              type="email"
              label="Email address"
              icon={Mail}
              placeholder="you@example.com"
              register={register('email')}
              error={errors.email?.message}
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

            {errors.root && (
              <div className="rounded-md bg-error-50 p-3">
                <p className="text-sm text-error-700">{errors.root.message}</p>
              </div>
            )}

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
