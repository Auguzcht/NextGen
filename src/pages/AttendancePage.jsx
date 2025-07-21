import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import { Card, Button, Table, Input, Badge } from '../components/ui';
import { motion } from 'framer-motion';

const AttendancePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch attendance when service or date changes
  useEffect(() => {
    if (selectedService) {
      fetchAttendance();
    }
  }, [selectedService, selectedDate]);

  // Search effect
  useEffect(() => {
    if (searchQuery.trim() && selectedService) {
      const timer = setTimeout(() => {
        searchChildren();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedService]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Failed to load services');
    }
  };

  // Update the fetchAttendance function to get all children and their current attendance status
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Get all active children
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select(`
          child_id,
          formal_id,
          first_name,
          last_name,
          gender,
          birthdate,
          photo_url,
          age_category_id,
          age_categories (category_name)
        `)
        .eq('is_active', true)
        .order('first_name');

      if (childrenError) throw childrenError;

      // Get attendance records only if service and date are selected
      let attendanceData = [];
      if (selectedService && selectedDate) {
        const { data, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('service_id', selectedService)
          .eq('attendance_date', selectedDate);

        if (attendanceError) throw attendanceError;
        attendanceData = data || [];
      }

      // Transform children data with attendance status
      const transformedData = (childrenData || []).map(child => ({
        children: child,
        child_id: child.child_id,
        ...attendanceData?.find(a => a.child_id === child.child_id)
      }));

      setAttendanceList(transformedData);
    } catch (error) {
      console.error('Error fetching children:', error);
      setError('Failed to load children list');
    } finally {
      setLoading(false);
    }
  };

  // Update handleCheckIn function
  const handleCheckIn = async (childId) => {
    if (!selectedService || !selectedDate) {
      setError('Please select a service and date first');
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const staffEmail = session?.user?.email || 'Unknown Staff';
      
      const { data, error } = await supabase.rpc('check_in_child', {
        p_child_id: childId,
        p_service_id: selectedService,
        p_checked_in_by: staffEmail
      });

      if (error) throw error;

      if (data && data[0].success) {
        // Only update the specific child's attendance status
        const updatedList = attendanceList.map(item => {
          if (item.child_id === childId) {
            return {
              ...item,
              attendance_id: data[0].attendance_id,
              check_in_time: new Date().toTimeString().split(' ')[0],
              checked_in_by: staffEmail
            };
          }
          return item;
        });
        setAttendanceList(updatedList);
      }
    } catch (error) {
      console.error('Error checking in child:', error);
      setError(`Failed to check in child: ${error.message}`);
    }
  };

  // Update handleCheckOut function
  const handleCheckOut = async (attendanceId) => {
    if (!attendanceId) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out_time: new Date().toTimeString().split(' ')[0] 
        })
        .eq('attendance_id', attendanceId);

      if (error) throw error;
      
      // Refresh attendance list
      await fetchAttendance();
    } catch (error) {
      console.error('Error checking out child:', error);
      setError(`Failed to check out child: ${error.message}`);
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
  
  // Define table columns for attendance records
  const attendanceColumns = [
    {
      header: "ID",
      accessor: row => row.children.formal_id || 'N/A',
      cellClassName: "font-medium text-gray-900",
      width: "100px"
    },
    {
      header: "Photo & Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.children.photo_url ? (
            <img
              src={row.children.photo_url}
              alt={`${row.children.first_name} ${row.children.last_name}`}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
              <span className="text-nextgen-blue-dark font-medium text-sm">
                {row.children.first_name?.charAt(0)}{row.children.last_name?.charAt(0)}
              </span>
            </div>
          )}
          <div className="font-medium text-gray-900">
            {row.children.first_name} {row.children.last_name}
          </div>
        </div>
      ),
      width: "300px"
    },
    {
      header: "Age / Group",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{calculateAge(row.children.birthdate)} yrs</span>
          {row.children.age_categories?.category_name && (
            <Badge variant="primary" size="sm">
              {row.children.age_categories?.category_name}
            </Badge>
          )}
        </div>
      ),
      width: "200px"
    },
    {
      header: "Check In",
      cell: (row) => {
        const attendance = attendanceList.find(a => 
          a.child_id === row.children.child_id && !a.check_out_time
        );
        return attendance ? (
          <div className="text-gray-900">
            <div>{formatTime(attendance.check_in_time)}</div>
            <div className="text-xs text-gray-500">by {attendance.checked_in_by || 'Unknown'}</div>
          </div>
        ) : (
          <span className="text-gray-500">Not checked in</span>
        );
      },
      width: "150px"
    },
    {
      header: "Check Out",
      cell: (row) => {
        const attendance = attendanceList.find(a => 
          a.child_id === row.children.child_id && a.check_out_time
        );
        return attendance?.check_out_time ? (
          <div className="text-gray-900">{formatTime(attendance.check_out_time)}</div>
        ) : (
          <span className="text-gray-500">-</span>
        );
      },
      width: "150px"
    },
    {
      header: "Actions",
      cell: (row) => {
        // Get current attendance record for this child
        const attendance = attendanceList.find(a => 
          a.child_id === row.children.child_id && !a.check_out_time
        );

        return (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="xs"
              onClick={() => handleCheckIn(row.children.child_id)}
              disabled={attendance} // Disable if already checked in
            >
              Check In
            </Button>
            <Button
              variant="danger"
              size="xs"
              onClick={() => handleCheckOut(attendance?.attendance_id)}
              disabled={!attendance} // Disable if not checked in
            >
              Check Out
            </Button>
          </div>
        );
      },
      width: "150px"
    }
  ];

  // Update the searchChildren function
  const searchChildren = async () => {
    if (!searchQuery.trim() || !selectedService) return;
    
    setSearching(true);
    try {
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select(`
          *,
          age_categories (category_name)
        `)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,formal_id.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);

      if (childrenError) throw childrenError;

      // Get attendance records for the selected service and date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('service_id', selectedService)
        .eq('attendance_date', selectedDate);

      if (attendanceError) throw attendanceError;

      // Transform children data to match attendance structure
      const transformedData = (childrenData || []).map(child => ({
        children: child,
        child_id: child.child_id,
        ...attendanceData?.find(a => a.child_id === child.child_id)
      }));

      // Update search results instead of attendance list
      setSearchResults(transformedData);
      
      // If no search query, refresh the full attendance list
      if (!searchQuery.trim()) {
        await fetchAttendance();
      }
    } catch (error) {
      console.error('Error searching children:', error);
      setError('Failed to search children');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="page-container">
      <Card
        title="Attendance Management"
        titleColor="text-nextgen-blue-dark"
        variant="default"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }
      >
        <motion.div 
          className="px-1 py-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Your existing check-in content */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Check In
              </h3>
              
              {/* Filters Row */}
              <div className="flex flex-wrap gap-4">
                {/* Service Select */}
                <div className="w-72">
                  <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Service
                  </label>
                  <select
                    id="service-select"
                    value={selectedService || ''}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="nextgen-form-select"
                  >
                    <option value="">Select Service</option>
                    {services.map((service) => (
                      <option key={service.service_id} value={service.service_id}>
                        {service.service_name} ({service.day_of_week})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Input */}
                <div className="w-48">
                  <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    id="date-select"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-[42px]"
                  />
                </div>

                {/* Search Input */}
                <div className="flex-1">
                  <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Child
                  </label>
                  <div className="relative">
                    <input
                      id="search-input"
                      type="text"
                      placeholder="Search by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={!selectedService}
                      className="nextgen-form-input"
                    />
                    <div className="absolute right-3 top-[11px] text-gray-400">
                      {searching ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance List with proper padding matching ChildrenPage */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <Table
                data={searchQuery.trim() ? searchResults : attendanceList}
                columns={attendanceColumns}
                isLoading={loading}
                noDataMessage="No children found"
                highlightOnHover={true}
                variant="primary"
                stickyHeader={true}
                size="md"
                className="min-w-full divide-y divide-gray-200"
                headerClassName="bg-gray-50"
                bodyClassName="bg-white divide-y divide-gray-200"
              />
            </div>
          </div>
        </motion.div>
      </Card>
    </div>
  );
};

export default AttendancePage;