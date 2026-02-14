import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Button, Badge, AlertNew, AlertTitle, AlertDescription } from '../components/ui';
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
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 60000; // 1 minute cache

  // Cache fetched data with session storage
  const fetchWithCache = useCallback(async (key, fetchFn) => {
    const cacheKey = `nextgen_dashboard_${key}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(`${cacheKey}_time`);
    
    // Use cache if it's less than 1 minute old
    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < CACHE_DURATION) {
      return JSON.parse(cachedData);
    }
    
    // Otherwise fetch fresh data
    const data = await fetchFn();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    return data;
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get children count
        const fetchChildrenCount = async () => {
          const { count, error } = await supabase
            .from('children')
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          return count || 0;
        };
        
        // Get this week's attendance
        const fetchAttendanceData = async () => {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
          
          const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .gte('attendance_date', startOfWeek.toISOString().split('T')[0]);
          
          if (error) throw error;
          return data || [];
        };
        
        // Get this month's registrations
        const fetchRegistrationsData = async () => {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          
          const { data, error } = await supabase
            .from('children')
            .select('*')
            .gte('registration_date', startOfMonth.toISOString().split('T')[0]);
          
          if (error) throw error;
          return data || [];
        };
        
        // Get services count
        const fetchServicesCount = async () => {
          const { count, error } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          return count || 0;
        };
        
        // Fetch recent activities (latest 5 check-ins) with improved selection
        const fetchRecentActivity = async () => {
          // First, fetch recent check-ins
          const { data: checkInData, error: checkInError } = await supabase
            .from('attendance')
            .select(`
              *,
              children (
                child_id,
                first_name,
                last_name,
                gender,
                photo_url,
                age_categories (category_name)
              ),
              services (service_name),
              checked_in_by
            `)
            .order('attendance_date', { ascending: false })
            .order('check_in_time', { ascending: false })
            .limit(5);
            
          if (checkInError) throw checkInError;
          
          // Then, fetch recent registrations
          const { data: registrationData, error: registrationError } = await supabase
            .from('children')
            .select(`
              *,
              age_categories (category_name)
            `)
            .order('registration_date', { ascending: false })
            .limit(5);
            
          if (registrationError) throw registrationError;
          
          // Add a 'type' field to each record to identify if it's a check-in or registration
          const checkIns = (checkInData || []).map(item => ({
            ...item,
            type: 'check-in',
            date: item.attendance_date,
            // Ensure we have a unique ID for each activity
            activity_id: `checkin-${item.attendance_id}`
          }));
          
          const registrations = (registrationData || []).map(item => ({
            ...item,
            type: 'registration',
            date: item.registration_date,
            // Ensure we have a unique ID for each activity
            activity_id: `reg-${item.child_id}`
          }));
          
          // Combine and sort both types by date
          const combinedActivity = [...checkIns, ...registrations].sort((a, b) => {
            // Sort by date first
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) return dateComparison;
            
            // If same date, check-ins should come first
            if (a.type !== b.type) {
              return a.type === 'check-in' ? -1 : 1;
            }
            
            // If both are the same type, use the original ordering
            return 0;
          }).slice(0, 6); // Limit to 6 most recent activities
          
          return combinedActivity;
        };
        
        // Use cached functions for all fetches
        const [
          childrenCount, 
          attendanceData, 
          registrationsData, 
          servicesCount,
          recentCheckIns
        ] = await Promise.all([
          fetchWithCache('childrenCount', fetchChildrenCount),
          fetchWithCache('attendanceData', fetchAttendanceData),
          fetchWithCache('registrationsData', fetchRegistrationsData),
          fetchWithCache('servicesCount', fetchServicesCount),
          fetchWithCache('recentActivity', fetchRecentActivity)
        ]);
        
        setStats({
          children: childrenCount,
          attendance: attendanceData.length,
          registrations: registrationsData.length,
          services: servicesCount
        });
        
        setRecentActivity(recentCheckIns);
        setLastFetchTime(Date.now());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [fetchWithCache]);
  
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

  // Get staff name - handles both email addresses (old data) and full names (new data)
  const getStaffName = (value) => {
    if (!value) return 'Unknown';
    
    // If it's an email address (contains @), convert it to a readable name
    if (value.includes('@')) {
      const emailPart = value.split('@')[0];
      // Split by dots or underscores and capitalize each part
      const nameParts = emailPart.split(/[._]/).map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      );
      return nameParts.join(' ');
    }
    
    // Otherwise, return the name as-is (it's already a full name)
    return value;
  };

  return (
    <div className="page-container">
      {error && (
        <AlertNew variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </AlertNew>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="page-title text-nextgen-blue-dark">NextGen Ministry Dashboard</h1>
          <p className="text-nextgen-orange/80 text-sm">
            Welcome, {user?.first_name || user?.user_metadata?.first_name || user?.email?.split('@')[0]}
          </p>
        </div>
      </div>
      
      {/* Stats Cards */}
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
      
      {/* Recent Activity - Improved Design */}
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
                  key={activity.activity_id} 
                  className="py-4 px-3 flex items-center justify-between hover:bg-gray-50 rounded-md transition-colors"
                  whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                >
                  <div className="flex items-center">
                    {/* Show child photo or initials */}
                    {activity.type === 'check-in' ? (
                      activity.children?.photo_url ? (
                        <img
                          src={activity.children?.photo_url}
                          alt={`${activity.children?.first_name} ${activity.children?.last_name}`}
                          className="h-10 w-10 rounded-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${import.meta.env.BASE_URL}placeholder-avatar.png`;
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center text-nextgen-blue-dark font-medium text-sm">
                          {activity.children?.first_name?.charAt(0) || '?'}
                          {activity.children?.last_name?.charAt(0) || ''}
                        </div>
                      )
                    ) : (
                      activity.photo_url ? (
                        <img
                          src={activity.photo_url}
                          alt={`${activity.first_name} ${activity.last_name}`}
                          className="h-10 w-10 rounded-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${import.meta.env.BASE_URL}placeholder-avatar.png`;
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-nextgen-orange/10 flex items-center justify-center text-nextgen-orange-dark font-medium text-sm">
                          {activity.first_name?.charAt(0) || '?'}
                          {activity.last_name?.charAt(0) || ''}
                        </div>
                      )
                    )}
                    
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {/* Show child name */}
                        {activity.type === 'check-in' 
                          ? `${activity.children?.first_name} ${activity.children?.last_name}`
                          : `${activity.first_name} ${activity.last_name}`
                        }
                        <Badge variant={activity.type === 'check-in' ? "primary" : "success"} size="xs">
                          {activity.type === 'check-in' 
                            ? activity.children?.age_categories?.category_name || 'No Age Group'
                            : activity.age_categories?.category_name || 'No Age Group'
                          }
                        </Badge>
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {activity.type === 'check-in' ? (
                          <>
                            <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>
                            Checked in to {activity.services?.service_name} on {formatDate(activity.attendance_date)}
                          </>
                        ) : (
                          <>
                            <span className="inline-block w-2 h-2 rounded-full bg-nextgen-orange mr-1"></span>
                            New registration on {formatDate(activity.registration_date)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end text-right">
                    {activity.type === 'check-in' ? (
                      <>
                        <span className="text-sm font-medium text-nextgen-blue-dark">
                          {formatTime(activity.check_in_time)}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {getStaffName(activity.checked_in_by)}
                        </span>
                      </>
                    ) : (
                      <Badge variant="success">
                        New Child
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
              
              <div className="pt-4 flex justify-center">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/attendance?tab=records')}
                  size="sm"
                  className="mr-2"
                >
                  View Check-ins
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/children')}
                  size="sm"
                >
                  View Children
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