import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-8 w-8 text-primary-400" />
              <span className="text-xl font-bold">Tennis Court Booking</span>
            </div>
            <p className="text-gray-400 mb-4">
              Book your tennis courts online with ease. Manage your reservations and stay updated with club announcements.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/courts" className="text-gray-400 hover:text-white transition-colors">
                  View Courts
                </Link>
              </li>
              <li>
                <Link to="/book-court" className="text-gray-400 hover:text-white transition-colors">
                  Book a Court
                </Link>
              </li>
              <li>
                <Link to="/announcements" className="text-gray-400 hover:text-white transition-colors">
                  Announcements
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-gray-400 hover:text-white transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-gray-400">
                <Mail className="h-4 w-4" />
                <span>info@tenniscourt.com</span>
              </li>
              <li className="flex items-center space-x-2 text-gray-400">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center space-x-2 text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>123 Tennis St, Sport City</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Tennis Court Booking. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer