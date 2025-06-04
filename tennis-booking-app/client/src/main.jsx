import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import 'react-datepicker/dist/react-datepicker.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </AuthProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// client/src/index.css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply box-border;
  }
  
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 font-medium text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-primary {
    @apply btn bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500;
  }
  
  .btn-secondary {
    @apply btn bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500;
  }
  
  .btn-outline {
    @apply btn border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-gray-500;
  }
  
  .btn-danger {
    @apply btn bg-error-600 text-white hover:bg-error-700 focus:ring-error-500;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200;
  }
  
  .card-header {
    @apply px-6 py-4 border-b border-gray-200;
  }
  
  .card-body {
    @apply p-6;
  }
  
  .form-label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
  
  .form-input {
    @apply block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }
  
  .form-error {
    @apply text-sm text-error-600 mt-1;
  }
  
  .form-group {
    @apply mb-4;
  }
  
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  
  .badge-primary {
    @apply badge bg-primary-100 text-primary-800;
  }
  
  .badge-success {
    @apply badge bg-success-100 text-success-800;
  }
  
  .badge-warning {
    @apply badge bg-warning-100 text-warning-800;
  }
  
  .badge-error {
    @apply badge bg-error-100 text-error-800;
  }
  
  .spinner {
    @apply animate-spin h-5 w-5 text-primary-600;
  }
  
  .table {
    @apply min-w-full divide-y divide-gray-200;
  }
  
  .table-header {
    @apply bg-gray-50;
  }
  
  .table-header-cell {
    @apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider;
  }
  
  .table-body {
    @apply bg-white divide-y divide-gray-200;
  }
  
  .table-cell {
    @apply px-6 py-4 whitespace-nowrap text-sm;
  }
  
  .modal-overlay {
    @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4;
  }
  
  .modal-content {
    @apply bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto;
  }
  
  .tab-list {
    @apply flex space-x-1 border-b border-gray-200;
  }
  
  .tab {
    @apply px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300 transition-colors;
  }
  
  .tab-active {
    @apply text-primary-600 border-primary-600;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}

/* React Big Calendar Custom Styles */
.rbc-calendar {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4;
}

.rbc-header {
  @apply text-sm font-medium text-gray-700 py-2;
}

.rbc-today {
  @apply bg-primary-50;
}

.rbc-event {
  @apply bg-primary-500 border-none text-white text-xs;
}

.rbc-event.rbc-selected {
  @apply bg-primary-600;
}

.rbc-day-slot .rbc-time-slot {
  @apply border-t border-gray-100;
}

.rbc-timeslot-group {
  @apply border-l border-gray-200;
}

/* React Datepicker Custom Styles */
.react-datepicker-wrapper {
  @apply w-full;
}

.react-datepicker {
  @apply font-sans border border-gray-200 shadow-lg;
}

.react-datepicker__header {
  @apply bg-primary-50 border-b border-gray-200;
}

.react-datepicker__day--selected {
  @apply bg-primary-500 text-white;
}

.react-datepicker__day--keyboard-selected {
  @apply bg-primary-200;
}

.react-datepicker__day:hover {
  @apply bg-gray-100;
}