import { useEffect, useState } from 'react';
import supabase from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    children: 0,
    attendance: 0,
    registrations: 0,
    services: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get children count
        const { count: childrenCount } = await supabase
          .from('children')
          .select('*', { count: 'exact', head: true });
        
        // Get this week's attendance
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('*')
          .gte('attendance_date', startOfWeek.toISOString().split('T')[0]);
        
        // Get this month's registrations
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const { data: registrationsData } = await supabase
          .from('children')
          .select('*')
          .gte('registration_date', startOfMonth.toISOString().split('T')[0]);
        
        // Get services count
        const { count: servicesCount } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true });
        
        setStats({
          children: childrenCount || 0,
          attendance: attendanceData?.length || 0,
          registrations: registrationsData?.length || 0,
          services: servicesCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">NextGen Ministry Dashboard</h1>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-4">Welcome, {user?.email}</span>
            <button 
              className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6 animate-in fade-in duration-300">
          <h2 className="text-lg font-medium mb-4">Children</h2>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold">{stats.children}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">Total registered children</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 animate-in fade-in duration-300 delay-100">
          <h2 className="text-lg font-medium mb-4">Attendance</h2>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold">{stats.attendance}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">Children this week</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 animate-in fade-in duration-300 delay-200">
          <h2 className="text-lg font-medium mb-4">New Registrations</h2>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold">{stats.registrations}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">Children this month</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 animate-in fade-in duration-300 delay-300">
          <h2 className="text-lg font-medium mb-4">Services</h2>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-3xl font-bold">{stats.services}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">Active services</p>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="mt-8 bg-white shadow rounded-lg p-6 animate-in fade-in duration-300 delay-400">
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <div className="border-t border-gray-200">
          {loading ? (
            <div className="py-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-gray-500 text-center">No recent activity to display</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;