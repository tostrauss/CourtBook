import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { Calendar, Clock, Users, Shield, ArrowRight, Bell } from 'lucide-react'

const Home = () => {
  const { isAuthenticated } = useAuth()
  const { data: announcementsData } = useAnnouncements({ limit: 3, type: 'urgent' })

  const features = [
    {
      icon: Calendar,
      title: 'Easy Booking',
      description: 'Book courts up to 7 days in advance with our simple interface'
    },
    {
      icon: Clock,
      title: 'Real-Time Availability',
      description: 'See available slots instantly and get immediate confirmation'
    },
    {
      icon: Users,
      title: 'Manage Reservations',
      description: 'View, modify, and cancel your bookings easily'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your data is safe with our secure booking system'
    }
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Book Your Tennis Court Online
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Simple, fast, and convenient court reservations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/book-court" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-3">
                  Book a Court Now
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-3">
                    Get Started
                  </Link>
                  <Link to="/login" className="btn-outline border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Urgent Announcements */}
      {announcementsData?.data?.length > 0 && (
        <section className="bg-warning-50 border-t-4 border-warning-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-2 mb-2">
              <Bell className="h-5 w-5 text-warning-600" />
              <h3 className="font-semibold text-warning-800">Important Announcements</h3>
            </div>
            <div className="space-y-2">
              {announcementsData.data.map(announcement => (
                <div key={announcement._id} className="text-sm text-warning-700">
                  <strong>{announcement.title}:</strong> {announcement.content.substring(0, 100)}...
                  <Link to="/announcements" className="text-warning-800 underline ml-1">Read more</Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Booking System?
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to manage your tennis court reservations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-lg mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Book your court in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Date & Time</h3>
              <p className="text-gray-600">Select your preferred date and available time slot</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Select Court</h3>
              <p className="text-gray-600">Pick from available courts that suit your needs</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Confirm Booking</h3>
              <p className="text-gray-600">Review and confirm your reservation instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Book Your Court?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join our community and start booking courts today
          </p>
          <Link
            to={isAuthenticated ? '/book-court' : '/register'}
            className="btn-primary bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 inline-flex items-center"
          >
            {isAuthenticated ? 'Book Now' : 'Get Started'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home