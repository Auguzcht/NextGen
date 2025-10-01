import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import { Card, Button, Table, Input, Badge } from '../components/ui';
import { motion } from 'framer-motion';
import QRScannerModal from '../components/common/QRScannerModal';
import Swal from 'sweetalert2';

const AttendancePage = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [checkedInList, setCheckedInList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Fetch services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch checked-in children when service or date changes
  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchCheckedInChildren();
    }
  }, [selectedService, selectedDate, checkInSuccess]);

  // Debounce search query
  useEffect(() => {
    setSearching(!!searchQuery);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setSearching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use debounced search query for fetching
  useEffect(() => {
    if (debouncedSearchQuery && selectedService) {
      searchChildren();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, selectedService, selectedDate]);

  // Cache fetched data
  const fetchWithCache = useCallback(async (key, fetchFn) => {
    const cacheKey = `nextgen_${key}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(`${cacheKey}_time`);
    
    // Use cache if it's less than 5 minutes old
    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < 300000) {
      return JSON.parse(cachedData);
    }
    
    // Otherwise fetch fresh data
    const data = await fetchFn();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    return data;
  }, []);

  const fetchServices = async () => {
    try {
      const fetchServicesFn = async () => {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('service_name');

        if (error) throw error;
        return data || [];
      };

      const data = await fetchWithCache('services', fetchServicesFn);
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Failed to load services');
    }
  };

  // Fetch only already checked-in children for this service/date
  const fetchCheckedInChildren = async () => {
    if (!selectedService || !selectedDate) return;
    
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
            birthdate,
            photo_url,
            age_categories (category_name)
          ),
          services (
            service_name,
            day_of_week
          )
        `)
        .eq('service_id', selectedService)
        .eq('attendance_date', selectedDate);

      if (error) throw error;
      setCheckedInList(data || []);
    } catch (error) {
      console.error('Error fetching checked-in children:', error);
      setError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  // Search for children to check in
  const searchChildren = async () => {
    if (!debouncedSearchQuery.trim() || !selectedService) return;
    
    setSearching(true);
    try {
      // First check if any matching children are already checked in
      const checkedInIds = checkedInList.map(item => item.children?.child_id);
      
      const { data, error } = await supabase
        .from('children')
        .select(`
          *,
          age_categories (category_name)
        `)
        .or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,formal_id.ilike.%${debouncedSearchQuery}%`)
        .eq('is_active', true)
        .limit(5); // Limit to 5 results for better UX

      if (error) throw error;
      
      // Filter out already checked-in children
      const filteredResults = (data || []).filter(
        child => !checkedInIds.includes(child.child_id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching children:', error);
      setError('Failed to search children');
    } finally {
      setSearching(false);
    }
  };

  // Handle checking in a child
  const handleCheckIn = async (childId) => {
    if (!selectedService || !selectedDate) {
      setError('Please select a service and date first');
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const staffEmail = session?.user?.email || 'Unknown Staff';
      
      // Get current local time
      const now = new Date();
      const localTime = now.toTimeString().split(' ')[0]; // Format: "HH:MM:SS"
      
      // First check if child is already checked in today
      const { data: existingCheckIn, error: checkError } = await supabase
        .from('attendance')
        .select('attendance_id')
        .eq('child_id', childId)
        .eq('service_id', selectedService)
        .eq('attendance_date', selectedDate)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      let result;
      
      if (existingCheckIn) {
        // Update existing record
        result = await supabase
          .from('attendance')
          .update({
            check_in_time: localTime,
            checked_in_by: staffEmail
          })
          .eq('attendance_id', existingCheckIn.attendance_id);
      } else {
        // Create new attendance record
        result = await supabase
          .from('attendance')
          .insert({
            child_id: childId,
            service_id: selectedService,
            attendance_date: selectedDate,
            check_in_time: localTime,
            checked_in_by: staffEmail
          });
      }
      
      if (result.error) throw result.error;
      
      // Reset checkInSuccess to force refresh
      setCheckInSuccess(prev => !prev);
      
      // Clear search results and query
      setSearchResults([]);
      setSearchQuery('');
      
      // Show success feedback
      setError(null);
    } catch (error) {
      console.error('Error checking in child:', error);
      setError(`Failed to check in child: ${error.message}`);
    }
  };

  // Handle checking out a child
  const handleCheckOut = async (attendanceId) => {
    if (!attendanceId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const staffEmail = session?.user?.email || 'Unknown Staff';
      
      // Get current local time
      const now = new Date();
      const localTime = now.toTimeString().split(' ')[0]; // Format: "HH:MM:SS"
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out_time: localTime,
          checked_out_by: staffEmail
        })
        .eq('attendance_id', attendanceId);

      if (error) throw error;
      
      // Reset checkInSuccess to force refresh of checked-in list
      setCheckInSuccess(prev => !prev);
    } catch (error) {
      console.error('Error checking out child:', error);
      setError(`Failed to check out child: ${error.message}`);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // For a time string like "09:00:00"
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      
      // Create a date object using the current date
      const date = new Date();
      
      // Set the time components
      date.setHours(hours);
      date.setMinutes(minutes);
      date.setSeconds(seconds || 0);
      
      // Format to local time with AM/PM
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // Ensures AM/PM display
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return timeString;
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Search results component
  const SearchResultsList = () => {
    if (searchResults.length === 0) {
      // If actively searching but no results found, show "No results" message
      if (debouncedSearchQuery && !searching) {
        return (
          <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
            <p className="text-gray-500">No matching children found</p>
          </div>
        );
      }
      return null;
    }
    
    return (
      <div className="mt-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm max-h-60 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Search Results</h4>
        <div className="space-y-2">
          {searchResults.map(child => (
            <div key={child.child_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md">
              <div className="flex items-center gap-3">
                {child.photo_url ? (
                  <img
                    src={child.photo_url}
                    alt={`${child.first_name} ${child.last_name}`}
                    className="h-8 w-8 rounded-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `${import.meta.env.BASE_URL}placeholder-avatar.png`;
                    }}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
                    <span className="text-nextgen-blue-dark font-medium text-xs">
                      {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {child.first_name} {child.last_name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span>{calculateAge(child.birthdate)} yrs</span>
                    {child.age_categories?.category_name && (
                      <Badge variant="primary" size="xs">
                        {child.age_categories?.category_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="primary"
                size="xs"
                onClick={() => handleCheckIn(child.child_id)}
              >
                Check In
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Define table columns for currently checked-in children
  const checkedInColumns = [
    {
      header: "ID",
      accessor: row => row.children?.formal_id || 'N/A',
      cellClassName: "font-medium text-gray-900",
      width: "100px"
    },
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.children?.photo_url ? (
            <img
              src={row.children?.photo_url}
              alt={`${row.children?.first_name} ${row.children?.last_name}`}
              className="h-10 w-10 rounded-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `${import.meta.env.BASE_URL}placeholder-avatar.png`;
              }}
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
              <span className="text-nextgen-blue-dark font-medium text-sm">
                {row.children?.first_name?.charAt(0)}{row.children?.last_name?.charAt(0)}
              </span>
            </div>
          )}
          <div className="font-medium text-gray-900">
            {row.children?.first_name} {row.children?.last_name}
          </div>
        </div>
      ),
      width: "250px"
    },
    {
      header: "Age / Group",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{calculateAge(row.children?.birthdate)} yrs</span>
          {row.children?.age_categories?.category_name && (
            <Badge variant="primary" size="sm">
              {row.children?.age_categories?.category_name}
            </Badge>
          )}
        </div>
      ),
      width: "180px"
    },
    {
      header: "Check In",
      cell: (row) => (
        <div className="text-gray-900">
          <div>{formatTime(row.check_in_time)}</div>
          <div className="text-xs text-gray-500">by {row.checked_in_by || 'Unknown'}</div>
        </div>
      ),
      width: "150px"
    },
    {
      header: "Check Out",
      cell: (row) => row.check_out_time ? (
        <div className="text-gray-900">
          <div>{formatTime(row.check_out_time)}</div>
          <div className="text-xs text-gray-500">by {row.checked_out_by || 'Unknown'}</div>
        </div>
      ) : (
        <span className="text-gray-500">-</span>
      ),
      width: "150px"
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          variant="danger"
          size="xs"
          onClick={() => handleCheckOut(row.attendance_id)}
          disabled={!!row.check_out_time} // Disable if already checked out
        >
          Check Out
        </Button>
      ),
      width: "100px"
    }
  ];

  // Add this function to handle QR scan results
  const handleQRScanSuccess = useCallback(async (scannedId) => {
    if (!selectedService || !selectedDate) {
      setError('Please select a service and date first');
      return;
    }
    
    try {
      // Try to find a child with this formal ID
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('child_id, first_name, last_name, formal_id')
        .eq('formal_id', scannedId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (childError) throw childError;
      
      if (!childData) {
        setError(`No child found with ID: ${scannedId}`);
        return;
      }
      
      // Check if child is already checked in
      const { data: existingCheckIn, error: checkInError } = await supabase
        .from('attendance')
        .select('attendance_id, check_out_time')
        .eq('child_id', childData.child_id)
        .eq('service_id', selectedService)
        .eq('attendance_date', selectedDate)
        .maybeSingle();
      
      if (checkInError) throw checkInError;
      
      if (existingCheckIn) {
        // Child is already checked in
        if (existingCheckIn.check_out_time) {
          // Already checked out
          setError(`${childData.first_name} ${childData.last_name} is already checked out`);
        } else {
          // Checked in but not out - perform check out
          await handleCheckOut(existingCheckIn.attendance_id);
          
          // Show success message as an error with positive styling
          setError(null);
          // Use Swal (SweetAlert2) with NextGen styling
          Swal.fire({
            icon: 'success',
            title: `${childData.first_name} checked OUT`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            width: 'auto',
            padding: '0.75em',
            iconColor: '#e66300', // nextgen-orange-dark
            customClass: {
              popup: 'swal-nextgen-toast',
              title: 'swal-nextgen-title'
            }
          });
        }
      } else {
        // Not checked in yet - perform check in
        await handleCheckIn(childData.child_id);
        
        // Show success message
        setError(null);
        // Use Swal with NextGen styling
        Swal.fire({
          icon: 'success',
          title: `${childData.first_name} checked IN`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          width: 'auto',
          padding: '0.75em',
          iconColor: '#1ca7bc', // nextgen-blue-dark
          customClass: {
            popup: 'swal-nextgen-toast',
            title: 'swal-nextgen-title'
          }
        });
      }
    
      // Refresh the checked-in list
      fetchCheckedInChildren();
      
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setError(`Failed to process scan: ${error.message}`);
    }
  }, [selectedService, selectedDate, handleCheckIn, handleCheckOut, fetchCheckedInChildren]);

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
          {/* Error messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              <div className="flex">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Check-In Form */}
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
                  <Input
                    type="select"
                    id="service-select"
                    value={selectedService || ''}
                    onChange={(e) => setSelectedService(e.target.value)}
                    options={[
                      { value: '', label: 'Select Service' },
                      ...services.map(service => ({
                        value: service.service_id,
                        label: `${service.service_name} (${service.day_of_week})`
                      }))
                    ]}
                    className="h-[42px]"
                  />
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

                {/* Search Input - Modified with QR button */}
                <div className="flex-1 flex flex-col">
                  <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Child
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        id="search-input"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedService}
                        className="h-[42px]"
                        startIcon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        }
                        endIcon={searching ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : searchQuery ? (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </button>
                        ) : null}
                        />
                    </div>

                    <Button
                      variant="primary"
                      disabled={!selectedService}
                      onClick={() => setShowScannerModal(true)}
                      className="h-[42px] w-[42px] p-0 flex items-center justify-center"
                      title="Scan QR Code"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search results */}
              <SearchResultsList />
            </div>

            {/* Currently Checked In List */}
            <div>
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4 flex justify-between">
                <span>Currently Checked In</span>
                <span className="text-sm text-gray-500 mt-1">
                  {checkedInList.length} {checkedInList.length === 1 ? 'Child' : 'Children'}
                </span>
              </h3>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <Table
                  data={checkedInList}
                  columns={checkedInColumns}
                  isLoading={loading}
                  noDataMessage="No children checked in for this service"
                  highlightOnHover={true}
                  variant="primary"
                  stickyHeader={true}
                  size="md"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </Card>
      
      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  );
};

export default AttendancePage;