import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NextGenLogoSvg } from '../assets/index.js';

const MainLayout = ({ children }) => {
  const { user, staffProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Navigation links with conditional visibility based on role
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: 'grid-2' },
    { name: 'Children', path: '/children', icon: 'child' },
    { name: 'Attendance', path: '/attendance', icon: 'clipboard-check' },
    { name: 'Guardians', path: '/guardians', icon: 'users' },
    
    // Only show staff management for coordinators and administrators
    ...(staffProfile?.role === 'Administrator' || staffProfile?.role === 'Coordinator' ? [
      { name: 'Staff', path: '/staff', icon: 'user-group' }
    ] : []),
    
    { name: 'Reports', path: '/reports', icon: 'chart-bar' },
    
    // Only show settings for administrators
    ...(staffProfile?.role === 'Administrator' ? [
      { name: 'Settings', path: '/settings', icon: 'cog' }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100 z-40' : 'opacity-0 -z-10'}`} onClick={() => setSidebarOpen(false)} />
      
      <div className={`fixed top-0 left-0 bottom-0 flex flex-col w-64 bg-indigo-800 text-white transition-all duration-300 transform z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static md:z-auto`}>
        <div className="flex-shrink-0 p-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <img className="h-8 w-auto mr-2" src={NextGenLogoSvg} alt="NextGen" />
            <span className="text-xl font-semibold">NextGen</span>
          </Link>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center px-4 py-2 text-sm rounded-md ${isActive ? 'bg-indigo-700' : 'hover:bg-indigo-700'}`}
                >
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="border-t border-indigo-700 p-4">
          {staffProfile && (
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-xl font-medium">{`${staffProfile.first_name[0]}${staffProfile.last_name[0]}`}</span>
                </div>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium">{`${staffProfile.first_name} ${staffProfile.last_name}`}</div>
                <div className="text-xs text-indigo-300 capitalize">{staffProfile.role}</div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-indigo-100 bg-indigo-700 rounded-md hover:bg-indigo-600"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;