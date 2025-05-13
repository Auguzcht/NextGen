import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import { Card, Button, Table, Input, Badge } from '../components/ui';
import { motion } from 'framer-motion';
import AttendanceFilters from '../components/attendance/AttendanceFilters.jsx';
import AttendanceCheckIn from '../components/attendance/AttendanceCheckIn.jsx';

const AttendancePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('checkin');
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);

  // Initialize the active tab based on URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['checkin', 'records'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/attendance?tab=${tab}`, { replace: true });
  };

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
      if (data && data.length > 0 && !selectedService) {
        setSelectedService(data[0].service_id);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Failed to load services. Please try again later.');
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
      setError('Failed to load attendance records. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (childId) => {
    if (!selectedService) return;
    
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
    } catch (error) {
      console.error('Error checking in child:', error);
      setError(`Failed to check in child: ${error.message}`);
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
      accessor: (row) => row.children.formal_id || 'N/A',
      cellClassName: "font-medium text-gray-900"
    },
    {
      header: "Name",
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-800">
            {row.children.first_name} {row.children.last_name}
          </div>
          {row.children.gender && (
            <div className="text-xs text-gray-500">
              {row.children.gender === 'M' ? 'Male' : 'Female'}
            </div>
          )}
        </div>
      )
    },
    {
      header: "Age / Group",
      cell: (row) => (
        <div>
          <span>{calculateAge(row.children.birthdate)} yrs</span>
          {row.children.age_categories?.category_name && (
            <Badge variant="primary" size="xs" className="ml-2">
              {row.children.age_categories?.category_name}
            </Badge>
          )}
        </div>
      )
    },
    {
      header: "Check In",
      cell: (row) => (
        <div>
          <div>{formatTime(row.check_in_time)}</div>
          <div className="text-xs text-gray-500">by {row.checked_in_by || 'Unknown'}</div>
        </div>
      )
    },
    {
      header: "Check Out",
      accessor: (row) => formatTime(row.check_out_time)
    },
    {
      header: "Actions",
      cell: (row) => !row.check_out_time && (
        <Button
          variant="primary"
          size="xs"
          onClick={() => handleCheckOut(row.attendance_id)}
        >
          Check Out
        </Button>
      )
    }
  ];

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'checkin':
        return (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">Check In</h3>
              
              <AttendanceFilters
                services={services}
                selectedService={selectedService}
                setSelectedService={setSelectedService}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <AttendanceCheckIn
                  selectedService={selectedService}
                  onCheckIn={handleCheckIn}
                  attendanceList={attendanceList}
                  disabled={!selectedService}
                />
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Attendance for {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              
              <Table
                data={attendanceList}
                columns={attendanceColumns}
                isLoading={loading}
                noDataMessage="No children checked in for this service and date"
                highlightOnHover={true}
                variant="primary"
                size="sm"
              />
            </div>
          </div>
        );
        
      case 'records':
        return (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">Attendance Records</h3>
              
              <AttendanceFilters
                services={services}
                selectedService={selectedService}
                setSelectedService={setSelectedService}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            </div>
            
            <div className="mt-4">
              <Table
                data={attendanceList}
                columns={attendanceColumns}
                isLoading={loading}
                noDataMessage="No attendance records found for the selected criteria"
                highlightOnHover={true}
                variant="primary"
                stickyHeader={true}
              />
            </div>
          </div>
        );
        
      default:
        return <div>Select a tab to view attendance</div>;
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
        <div className="border-b border-gray-200 -mt-2">
          <div className="flex space-x-2 md:space-x-6">
            <Button
              variant={activeTab === 'checkin' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('checkin')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
              iconPosition="left"
            >
              Check-in
            </Button>
            
            <Button
              variant={activeTab === 'records' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('records')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              iconPosition="left"
            >
              Records
            </Button>
          </div>
        </div>
        
        <motion.div 
          className="px-1 py-6"
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button 
                      onClick={() => setError(null)}
                      className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {renderTabContent()}
        </motion.div>
      </Card>
    </div>
  );
};

export default AttendancePage;