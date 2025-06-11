import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
};

export default PageLoader;