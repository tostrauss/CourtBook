// client/src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, XCircle as AlertCircleIcon } from 'lucide-react'; // Renamed XCircle
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext'; // To potentially auto-login
import { toast } from 'react-toastify';

// Common Components
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const schema = yup.object({
  password: yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters')
    .matches(/\d/, 'Password must contain at least one number'),
  confirmPassword: yup.string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth(); // For auto-login after successful reset
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('form'); // 'form', 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  const token = searchParams.get('token');
  
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid or missing password reset token in the link.');
    }
  }, [token]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: yupResolver(schema),
  });
  
  const onSubmit = async (data) => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Password reset token is missing.');
      return;
    }
    
    setIsLoading(true);
    setStatus('loading');
    setError('root', undefined);

    try {
      const response = await authService.resetPassword(token, data.password);
      // The authService now handles setting the token and user in AuthContext for auto-login
      // if the backend returns user and accessToken upon successful password reset.
      // We just need to check if the user object is available in the response.
      if (response.data?.user && response.data?.accessToken) {
        // Manually trigger login in context if backend doesn't auto-handle it via cookie/token setting
        // This depends on how your authService.resetPassword and backend are structured.
        // For now, assuming backend sends user and token, and authService stores token.
        // We might need to call `checkAuth()` or a specific login method from context.
        // Let's assume the token is set and context will pick it up or we navigate to login.
        await login({ email: response.data.user.email, password: data.password }); // Attempt auto-login
        toast.success('Password reset successfully! You are now logged in.');
        // Navigation to dashboard will be handled by login function in AuthContext
      } else {
        toast.success('Password reset successfully! Please log in with your new password.');
        navigate('/login');
      }
      setStatus('success'); // Though navigation might happen before this is seen
    } catch (error) {
      const apiErrorMessage = error.response?.data?.message || 'Failed to reset password. The link may be invalid or expired.';
      setErrorMessage(apiErrorMessage);
      setError('root', { message: apiErrorMessage });
      setStatus('error');
      // No toast here as error is displayed on page
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === 'loading' && !token) { // Initial check if token was bad from start
      return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 py-12 px-4">
            <Card className="max-w-md w-full shadow-xl">
                <div className="text-center p-8">
                    <AlertCircleIcon className="h-12 w-12 text-error-500 mx-auto mb-4" />
                    <h2 className="mt-2 text-2xl font-bold text-gray-900">Invalid Link</h2>
                    <p className="mt-2 text-sm text-gray-600">
                    The password reset link is invalid or missing a token.
                    </p>
                    <div className="mt-6">
                    <Button as={Link} to="/forgot-password" variant="primary">
                        Request New Link
                    </Button>
                    </div>
                </div>
            </Card>
        </div>
      )
  }


  if (status === 'error' && token) { // Error after attempting submission with a token
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 py-12 px-4">
        <Card className="max-w-md w-full shadow-xl">
            <div className="text-center p-8">
                <AlertCircleIcon className="h-12 w-12 text-error-500 mx-auto mb-4" />
                <h2 className="mt-2 text-2xl font-bold text-gray-900">Reset Failed</h2>
                <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
                <div className="mt-6 space-y-3">
                    <Button as={Link} to="/forgot-password" variant="primary" fullWidth>
                        Request New Link
                    </Button>
                    <Button as={Link} to="/login" variant="outline" fullWidth>
                        Back to Login
                    </Button>
                </div>
            </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card
          header={
            <div className="text-center">
              <Lock className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Reset Your Password
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter and confirm your new strong password.
              </p>
            </div>
          }
          className="shadow-xl"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              id="password"
              type="password"
              label="New Password"
              icon={Lock}
              placeholder="••••••••"
              register={register('password')}
              error={errors.password?.message}
              disabled={isLoading}
            />
            <Input
              id="confirmPassword"
              type="password"
              label="Confirm New Password"
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
            
            <Button type="submit" fullWidth isLoading={isLoading} disabled={isLoading || !token}>
              Reset Password
            </Button>

            <div className="text-center mt-4">
                <Button as={Link} to="/login" variant="link" size="sm" icon={ArrowLeft} iconPosition="left">
                    Back to Login
                </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
