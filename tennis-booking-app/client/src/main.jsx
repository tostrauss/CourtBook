import React from 'react'
        import ReactDOM from 'react-dom/client'
        import { BrowserRouter } from 'react-router-dom'
        import { QueryClient, QueryClientProvider } from 'react-query'
        import { ReactQueryDevtools } from 'react-query/devtools' // Corrected import path if it was an issue
        import { ToastContainer } from 'react-toastify'
        import 'react-toastify/dist/ReactToastify.css'
        import 'react-datepicker/dist/react-datepicker.css'
        import 'react-big-calendar/lib/css/react-big-calendar.css'
        import './index.css' // This line correctly imports your main CSS file
        import App from './App'
        import { AuthProvider } from './context/AuthContext'

        const queryClient = new QueryClient({
          defaultOptions: {
            queries: {
              refetchOnWindowFocus: false, // Default for react-query v3, might be different in v4/v5
              retry: 1, // Example: retry failed requests once
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
                    autoClose={3000} // Duration in ms
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored" // Or "light", "dark"
                  />
                </AuthProvider>
                {/* Show devtools only in development */}
                {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
              </QueryClientProvider>
            </BrowserRouter>
          </React.StrictMode>
        )
        