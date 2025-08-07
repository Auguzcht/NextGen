import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Button, Alert, Badge } from '../components/ui';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    children: 0,
    attendance: 0,
    registrations: 0,
    services: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get children count
        const { count: childrenCount, error: childrenError } = await supabase
          .from('children')
          .select('*', { count: 'exact', head: true });
        
        if (childrenError) throw childrenError;
        
        // Get this week's attendance
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .gte('attendance_date', startOfWeek.toISOString().split('T')[0]);
        
        if (attendanceError) throw attendanceError;
        
        // Get this month's registrations
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const { data: registrationsData, error: registrationsError } = await supabase
          .from('children')
          .select('*')
          .gte('registration_date', startOfMonth.toISOString().split('T')[0]);
        
        if (registrationsError) throw registrationsError;
        
        // Get services count
        const { count: servicesCount, error: servicesError } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true });
        
        if (servicesError) throw servicesError;
        
        // Fetch recent activities (latest 5 check-ins)
        // FIXED: Using attendance_date and check_in_time for ordering instead of created_at
        const { data: recentCheckIns, error: recentError } = await supabase
          .from('attendance')
          .select(`
            *,
            children (
              child_id,
              first_name,
              last_name,
              gender,
              age_categories (category_name)
            ),
            services (service_name)
          `)
          .order('attendance_date', { ascending: false })
          .order('check_in_time', { ascending: false })
          .limit(5);
          
        if (recentError) throw recentError;
        
        setStats({
          children: childrenCount || 0,
          attendance: attendanceData?.length || 0,
          registrations: registrationsData?.length || 0,
          services: servicesCount || 0
        });
        
        setRecentActivity(recentCheckIns || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);
  
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Handle time string in HH:MM:SS format
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (e) {
      return timeString;
    }
  };

  return (
    <div className="page-container">
      {error && (
        <Alert 
          variant="error" 
          title="Error" 
          dismissible 
          className="mb-6"
        >
          {error}
        </Alert>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="page-title text-nextgen-blue-dark">NextGen Ministry Dashboard</h1>
          <p className="text-nextgen-orange/80 text-sm">
            Welcome, {user?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0]}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Children"
          titleColor="text-nextgen-blue-dark"
          variant="primary"
          hoverable
          animate
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        >
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex flex-col">
              <p className="text-3xl font-bold text-nextgen-blue-dark">{stats.children}</p>
              <p className="text-sm text-gray-500 mt-2">Total registered children</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/children')}
                >
                  View All
                </Button>
              </div>
            </div>
          )}
        </Card>
        
        <Card 
          title="Attendance"
          titleColor="text-nextgen-orange-dark"
          variant="primary"
          hoverable
          animate
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        >
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex flex-col">
              <p className="text-3xl font-bold text-nextgen-orange-dark">{stats.attendance}</p>
              <p className="text-sm text-gray-500 mt-2">Children this week</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/attendance')}
                >
                  Check In
                </Button>
              </div>
            </div>
          )}
        </Card>
        
        <Card 
          title="New Registrations"
          titleColor="text-green-700"
          variant="primary"
          hoverable
          animate
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        >
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex flex-col">
              <p className="text-3xl font-bold text-green-700">{stats.registrations}</p>
              <p className="text-sm text-gray-500 mt-2">Children this month</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/children')}
                >
                  Register Child
                </Button>
              </div>
            </div>
          )}
        </Card>
        
        <Card 
          title="Services"
          titleColor="text-indigo-700"
          variant="primary"
          hoverable
          animate
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <div className="flex flex-col">
              <p className="text-3xl font-bold text-indigo-700">{stats.services}</p>
              <p className="text-sm text-gray-500 mt-2">Active services</p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => navigate('/settings?tab=services')}
                >
                  Manage
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card 
        title="Recent Activity"
        titleColor="text-nextgen-blue-dark"
        className="mt-8"
        animate
        variant="default"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        }
      >
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
          ) : recentActivity.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-center">No recent activity to display</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4"
                onClick={() => navigate('/attendance?tab=checkin')}
              >
                Go to Check-in
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActivity.map((activity) => (
                <motion.div 
                  key={activity.attendance_id} 
                  className="py-4 flex items-center justify-between"
                  whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center text-nextgen-blue-dark font-medium text-sm">
                      {activity.children?.first_name?.charAt(0) || '?'}
                      {activity.children?.last_name?.charAt(0) || ''}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.children?.first_name} {activity.children?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Checked in to {activity.services?.service_name} on {formatDate(activity.attendance_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Badge variant="primary" size="sm">
                      {activity.children?.age_categories?.category_name || 'No Age Group'}
                    </Badge>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatTime(activity.check_in_time)}
                    </span>
                  </div>
                </motion.div>
              ))}
              <div className="pt-4 flex justify-center">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/attendance?tab=records')}
                  size="sm"
                >
                  View All Records
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;