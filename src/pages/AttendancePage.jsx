import { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import supabase from '../services/supabase.js';

const AttendancePage = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchAttendance();
    }
  }, [selectedService, selectedDate]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_name');

      if (error) throw error;
      setServices(data || []);
      
      // Set first service as default if available
      if (data && data.length > 0) {
        setSelectedService(data[0].service_id);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          children (
            child_id,
            formal_id,
            first_name,
            last_name,
            gender,
            birthdate,
            photo_url,
            age_category_id,
            age_categories (category_name)
          )
        `)
        .eq('service_id', selectedService)
        .eq('attendance_date', selectedDate);

      if (error) throw error;
      setAttendanceList(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchChildren = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('children')
        .select(`
          *,
          age_categories (category_name)
        `)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,formal_id.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      
      // Filter out children already in attendance
      const filteredResults = data.filter(child => 
        !attendanceList.some(attendance => attendance.children.child_id === child.child_id)
      );
      
      setSearchResults(filteredResults || []);
    } catch (error) {
      console.error('Error searching children:', error);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      searchChildren();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, attendanceList]);

  const handleCheckIn = async (childId) => {
    if (!selectedService) return;
    
    setCheckingIn(true);
    try {
      // Get current staff email
      const { data: { session } } = await supabase.auth.getSession();
      const staffEmail = session?.user?.email || 'Unknown Staff';
      
      // Call check_in_child function
      const { data, error } = await supabase.rpc('check_in_child', {
        p_child_id: childId,
        p_service_id: selectedService,
        p_checked_in_by: staffEmail
      });

      if (error) throw error;
      
      // Refresh attendance list
      fetchAttendance();
      
      // Clear search
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error checking in child:', error);
      alert(`Error checking in child: ${error.message}`);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async (attendanceId) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out_time: new Date().toTimeString().split(' ')[0] })
        .eq('attendance_id', attendanceId);

      if (error) throw error;
      
      // Refresh attendance list
      fetchAttendance();
    } catch (error) {
      console.error('Error checking out child:', error);
      alert(`Error checking out child: ${error.message}`);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // Extract hours and minutes
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeString;
    }
  };

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <MainLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Attendance Tracking</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                id="service-select"
                value={selectedService || ''}
                onChange={(e) => setSelectedService(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select Service</option>
                {services.map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service_name} ({service.day_of_week})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date-select"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
            Check In Child
          </label>
          <div className="relative">
            <input
              id="search-input"
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!selectedService}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-sm max-h-64 overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {searchResults.map((child) => (
                  <li key={child.child_id} className="p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">
                          {child.first_name} {child.last_name} 
                          <span className="ml-2 text-sm text-gray-500">({child.formal_id || 'No ID'})</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          {calculateAge(child.birthdate)} years old • {child.age_categories?.category_name || 'No category'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckIn(child.child_id)}
                        disabled={checkingIn}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        Check In
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Attendance for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : attendanceList.length === 0 ? (
            <div className="bg-gray-50 p-4 text-center rounded-md">
              <p className="text-gray-500">No children checked in for this service and date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age / Group
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceList.map((attendance) => (
                    <tr key={attendance.attendance_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {attendance.children.formal_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendance.children.first_name} {attendance.children.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calculateAge(attendance.children.birthdate)} yrs / {attendance.children.age_categories?.category_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(attendance.check_in_time)} by {attendance.checked_in_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(attendance.check_out_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!attendance.check_out_time && (
                          <button
                            onClick={() => handleCheckOut(attendance.attendance_id)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AttendancePage;