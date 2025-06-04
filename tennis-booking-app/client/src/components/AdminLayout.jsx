mport React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BookOpen, 
  Megaphone,
  Menu,
  X 
} from 'lucide-react'

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courts', label: 'Courts', icon: Calendar },
    { to: '/admin/bookings', label: 'Bookings', icon: BookOpen },
    { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  ]

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full overflow-y-auto py-6">
          <h2 className="text-xl font-bold text-white px-6 mb-8">Admin Panel</h2>
          <nav className="space-y-1 px-3">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default AdminLayout