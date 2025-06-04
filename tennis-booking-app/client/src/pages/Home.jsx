// client/src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import announcementService from '../services/announcementService';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  ShieldCheck,
  ArrowRight,
  Bell,
  Zap,
  ThumbsUp,
  CheckCircle,
  MapPin,
  AlertTriangle,
  Info,
  User,
  ArrowRightCircle // Example if you wanted a different ArrowRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Common Components - Corrected Paths
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Home = () => {
  const { user, isAuthenticated } = useAuth();

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery(
    'homeAnnouncements',
    () => announcementService.getAnnouncements({ limit: 3, sort: '-isPinned,-priority,-publishDate', isActive: 'true' }),
    { staleTime: 5 * 60 * 1000 }
  );
  const announcements = announcementsData?.data || [];

  const features = [
    {
      icon: Zap,
      title: 'Instant Booking',
      description: 'Book your favorite courts in seconds with our streamlined process.',
      color: 'text-primary-500',
      bgColor: 'bg-primary-50',
    },
    {
      icon: Clock,
      title: 'Real-Time Availability',
      description: 'See up-to-the-minute court schedules and never miss a slot.',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      icon: Users,
      title: 'Manage Reservations',
      description: 'Easily view, modify, or cancel your bookings anytime, anywhere.',
      color: 'text-sky-500',
      bgColor: 'bg-sky-50',
    },
    {
      icon: ShieldCheck,
      title: 'Secure & Reliable',
      description: 'Your bookings and personal data are always safe with us.',
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: 'Select Date & Time',
      description: 'Choose your preferred day and the 60-minute slot that works for you.',
      icon: CalendarIcon,
    },
    {
      step: 2,
      title: 'Pick Your Court',
      description: 'Browse available courts based on type, surface, or features.',
      icon: MapPin,
    },
    {
      step: 3,
      title: 'Confirm & Play!',
      description: 'Review your booking details and confirm. It\'s that simple!',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-indigo-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            <span className="block">Your Next Match</span>
            <span className="block text-primary-300">Starts Here.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-primary-100 mb-10">
            Effortlessly book tennis courts online. View real-time availability, manage your reservations, and get back on the court faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as={Link}
              to={isAuthenticated ? "/book-court" : "/register"}
              variant="primary"
              size="lg"
              className="bg-white text-primary-700 hover:bg-primary-50 shadow-lg transform hover:scale-105"
              icon={isAuthenticated ? CalendarIcon : User}
            >
              {isAuthenticated ? 'Book a Court Now' : 'Get Started Free'}
            </Button>
            {!isAuthenticated && (
              <Button
                as={Link}
                to="/login"
                variant="outline"
                size="lg"
                className="border-primary-300 text-primary-100 hover:bg-white hover:text-primary-700 shadow-lg transform hover:scale-105"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Urgent Announcements Section */}
      {announcementsLoading && (
        <div className="py-4 text-center"><LoadingSpinner /></div>
      )}
      {!announcementsLoading && announcements.length > 0 && (
        <section className="py-8 bg-yellow-50 border-b-2 border-t-2 border-yellow-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center mb-3">
                <Bell className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
                <h2 className="text-xl font-semibold text-yellow-700">Important Updates</h2>
            </div>
            <div className="space-y-3">
              {announcements.map(announcement => (
                <Card key={announcement._id} className="bg-white border-yellow-300 shadow-sm hover:shadow-md">
                    <div className="flex items-start space-x-3 p-4">
                        <div className={`p-1.5 rounded-full mt-1 ${announcement.type === 'urgent' ? 'bg-error-100 text-error-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {announcement.type === 'urgent' ? <AlertTriangle className="h-4 w-4"/> : <Info className="h-4 w-4"/>}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800">{announcement.title}</h3>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{announcement.content}</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Posted: {format(parseISO(announcement.publishDate), 'MMM d,<x_bin_534>')}
                                {announcement.isPinned && <span className="ml-2 font-medium text-primary-600">(Pinned)</span>}
                            </p>
                        </div>
                    </div>
                </Card>
              ))}
            </div>
             {announcementsData?.count > 3 && (
                <div className="mt-4 text-center">
                    <Button as={Link} to="/announcements" variant="link" size="sm">
                        View All Announcements <ArrowRight className="h-3.5 w-3.5 ml-1"/>
                    </Button>
                </div>
             )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Everything You Need, All In One Place
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform is designed to make your tennis experience seamless and enjoyable.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
                <div className={`mx-auto flex items-center justify-center w-12 h-12 ${feature.bgColor} rounded-full mb-5 shadow-sm`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Get on the Court in 3 Simple Steps
            </h2>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Booking your next game has never been easier.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {howItWorksSteps.map((step) => (
              <Card key={step.step} className="text-center shadow-lg">
                <div className="mb-4">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold shadow-md">
                    {step.step}
                  </div>
                </div>
                <step.icon className="h-10 w-10 text-primary-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ThumbsUp className="h-12 w-12 text-primary-300 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-xl mx-auto">
            {isAuthenticated
              ? `Welcome back, ${user.firstName || user.username}! Your next court awaits.`
              : "Join our community of tennis enthusiasts and start booking courts with unparalleled ease."
            }
          </p>
          <Button
            as={Link}
            to={isAuthenticated ? "/book-court" : "/register"}
            variant="primary"
            size="lg"
            className="bg-white text-primary-700 hover:bg-primary-50 shadow-xl px-10 py-3.5 transform hover:scale-105"
            icon={isAuthenticated ? CalendarIcon : User}
          >
            {isAuthenticated ? 'Find a Court' : 'Sign Up & Book Now'}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
