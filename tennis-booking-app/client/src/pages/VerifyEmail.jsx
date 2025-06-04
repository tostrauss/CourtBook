// client/src/pages/VerifyEmail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle as AlertCircleIcon, Mail, Loader2 } from 'lucide-react'; // Renamed XCircle
import authService from '../services/authService';
import { toast } from 'react-toastify';

// Common Components
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner'; // Can use this instead of Loader2 directly

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Please wait while we verify your email address...');
  
  const token = searchParams.get('token');
  
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. The token is missing.');
        return;
      }
      
      try {
        await authService.verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been successfully verified! You will be redirected to login shortly.');
        toast.success('Email verified successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed. The link may be invalid or expired.');
        // No toast here, error is displayed on page
      }
    };
    
    verify();
  }, [token, navigate]);
  
  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <LoadingSpinner size="lg" className="mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Verifying Your Email</h2>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-success-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircleIcon className="h-16 w-16 text-error-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card className="shadow-xl">
            <div className="text-center p-8 md:p-10">
                <Mail className="h-12 w-12 text-primary-500 mx-auto mb-6"/>
                {renderContent()}
                <p className="mt-4 text-sm text-gray-600">{message}</p>
                
                {status === 'success' && (
                    <div className="mt-6">
                        <Button as={Link} to="/login" variant="primary">
                            Go to Login
                        </Button>
                    </div>
                )}
                {status === 'error' && (
                    <div className="mt-8 space-y-3">
                        <Button as={Link} to="/login" variant="outline" fullWidth>
                            Back to Login
                        </Button>
                        <Button as={Link} to="/register" variant="link" size="sm" fullWidth>
                            Need to register again?
                        </Button>
                    </div>
                )}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
