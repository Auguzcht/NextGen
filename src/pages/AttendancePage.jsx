import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import useImageCache from '../hooks/useImageCache.jsx';
import { Card, Button, Table, Input, Badge, DatePickerOverlay, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui';
import { motion } from 'framer-motion';
import QRScannerModal from '../components/common/QRScannerModal';
import ChildDetailView from '../components/children/ChildDetailView';
import RegistrationSuccessModal from '../components/children/RegistrationSuccessModal';
import PrintableIDCard from '../components/children/PrintableIDCard';
import AddChildForm from '../components/children/AddChildForm';
import { getPrintableIdValidation } from '../utils/childIdMapper.js';

const AttendancePage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
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
  const [showCheckOutAllDialog, setShowCheckOutAllDialog] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState([]);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('check_in_time');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Child detail view modal
  const [selectedChildForView, setSelectedChildForView] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Print ID and QR modal states
  const [showPrintableID, setShowPrintableID] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [registeredChildData, setRegisteredChildData] = useState(null);
  
  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedChildForEdit, setSelectedChildForEdit] = useState(null);
  
  // Remove from attendance states
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [attendanceToRemove, setAttendanceToRemove] = useState(null);
  
  // Mobile menu state for actions
  const [openMobileMenu, setOpenMobileMenu] = useState(null);
  
  // Image caching
  const { cacheImages, isInvalidImage, markInvalidImage } = useImageCache();

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
      setSelectedChildren([]); // Clear selections when search is cleared
    }
  }, [debouncedSearchQuery, selectedService, selectedDate]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMobileMenu(null);
    };

    if (openMobileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMobileMenu]);

  // Toggle child selection
  const toggleChildSelection = (childId) => {
    setSelectedChildren(prev => {
      if (prev.includes(childId)) {
        return prev.filter(id => id !== childId);
      } else {
        return [...prev, childId];
      }
    });
  };

  // Select all visible children
  const selectAllChildren = () => {
    const allIds = searchResults.map(child => child.child_id);
    setSelectedChildren(allIds);
  };

  // Deselect all children
  const deselectAllChildren = () => {
    setSelectedChildren([]);
  };

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
      let query = supabase
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
        .eq('attendance_date', selectedDate)
        .order('check_in_time', { ascending: false }); // Always order by check-in time, newest first

      const { data, error } = await query;

      if (error) throw error;
      setCheckedInList(data || []);
      
      // Cache all children photos
      if (data && data.length > 0) {
        const photoUrls = data
          .map(item => item.children?.photo_url)
          .filter(url => url);
        cacheImages(photoUrls);
      }
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
        .or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,formal_id.ilike.%${debouncedSearchQuery}%,nickname.ilike.%${debouncedSearchQuery}%`)
        .eq('is_active', true)
        .limit(5); // Limit to 5 results for better UX

      if (error) throw error;
      
      // Filter out already checked-in children
      const filteredResults = (data || []).filter(
        child => !checkedInIds.includes(child.child_id)
      );
      
      setSearchResults(filteredResults);
      
      // Cache search result photos
      if (filteredResults.length > 0) {
        const photoUrls = filteredResults
          .map(child => child.photo_url)
          .filter(url => url);
        cacheImages(photoUrls);
      }
    } catch (error) {
      console.error('Error searching children:', error);
      setError('Failed to search children');
    } finally {
      setSearching(false);
    }
  };

  // Handle checking in multiple children
  const handleCheckInMultiple = async () => {
    if (selectedChildren.length === 0) return;
    
    try {
      const staffName = user ? `${user.first_name} ${user.last_name}` : 'Unknown Staff';
      const now = new Date();
      const localTime = now.toTimeString().split(' ')[0];
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const childId of selectedChildren) {
        try {
          // Check if already checked in
          const { data: existingCheckIn } = await supabase
            .from('attendance')
            .select('attendance_id')
            .eq('child_id', childId)
            .eq('service_id', selectedService)
            .eq('attendance_date', selectedDate)
            .maybeSingle();
          
          if (existingCheckIn) {
            // Update existing record
            await supabase
              .from('attendance')
              .update({
                check_in_time: localTime,
                checked_in_by: staffName
              })
              .eq('attendance_id', existingCheckIn.attendance_id);
          } else {
            // Create new record
            await supabase
              .from('attendance')
              .insert({
                child_id: childId,
                service_id: selectedService,
                attendance_date: selectedDate,
                check_in_time: localTime,
                checked_in_by: staffName
              });
          }
          successCount++;
        } catch (err) {
          console.error(`Error checking in child ${childId}:`, err);
          errorCount++;
        }
      }
      
      // Reset state
      setCheckInSuccess(prev => !prev);
      setSelectedChildren([]);
      setSearchResults([]);
      setSearchQuery('');
      setError(null);
      
      // Show success message
      if (successCount > 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'child' : 'children'} checked in`, {
          duration: 2000
        });
      }
      
      if (errorCount > 0) {
        setError(`${errorCount} children failed to check in`);
      }
    } catch (error) {
      console.error('Error checking in children:', error);
      setError('Failed to check in children');
    }
  };

  // Handle checking in a child
  const handleCheckIn = async (childId) => {
    if (!selectedService || !selectedDate) {
      setError('Please select a service and date first');
      return;
    }
    
    try {
      const staffName = user ? `${user.first_name} ${user.last_name}` : 'Unknown Staff';
      
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
            checked_in_by: staffName
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
            checked_in_by: staffName
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
      const staffName = user ? `${user.first_name} ${user.last_name}` : 'Unknown Staff';
      
      // Get current local time
      const now = new Date();
      const localTime = now.toTimeString().split(' ')[0]; // Format: "HH:MM:SS"
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out_time: localTime,
          checked_out_by: staffName
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

  const handleCheckOutAll = async () => {
    try {
      const staffName = user ? `${user.first_name} ${user.last_name}` : 'Unknown Staff';
      const now = new Date();
      const localTime = now.toTimeString().split(' ')[0];
      
      const childrenToCheckOut = checkedInList.filter(item => !item.check_out_time);
      
      for (const item of childrenToCheckOut) {
        await supabase
          .from('attendance')
          .update({ 
            check_out_time: localTime,
            checked_out_by: staffName
          })
          .eq('attendance_id', item.attendance_id);
      }
      
      setCheckInSuccess(prev => !prev);
      setShowCheckOutAllDialog(false);
      
      toast.success('All Children Checked Out', {
        duration: 2000
      });
    } catch (error) {
      console.error('Error checking out all children:', error);
      setError('Failed to check out all children');
      setShowCheckOutAllDialog(false);
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

  // Convert email to readable name for display (handles old email data)
  const formatStaffName = (value) => {
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

  // Handle column sorting
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  // Sort the checked-in list based on current sort settings
  const sortedCheckedInList = useMemo(() => {
    if (!checkedInList || checkedInList.length === 0) return [];
    
    const sorted = [...checkedInList].sort((a, b) => {
      let aVal, bVal;
      
      switch(sortBy) {
        case 'children.formal_id':
          aVal = a.children?.formal_id || '';
          bVal = b.children?.formal_id || '';
          break;
        case 'children.first_name':
          aVal = a.children?.first_name?.toLowerCase() || '';
          bVal = b.children?.first_name?.toLowerCase() || '';
          break;
        case 'children.birthdate':
          aVal = a.children?.birthdate ? new Date(a.children.birthdate) : new Date(0);
          bVal = b.children?.birthdate ? new Date(b.children.birthdate) : new Date(0);
          break;
        case 'check_in_time':
          aVal = a.check_in_time || '';
          bVal = b.check_in_time || '';
          break;
        case 'check_out_time':
          aVal = a.check_out_time || '';
          bVal = b.check_out_time || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return sorted;
  }, [checkedInList, sortBy, sortOrder]);

  // Handle row click to view child details
  const handleRowClick = async (row) => {
    try {
      // Fetch full child details
      const { data: childData, error } = await supabase
        .from('children')
        .select(`
          *,
          age_categories(category_name),
          child_guardian(
            guardian_id,
            is_primary,
            guardians(first_name, last_name, phone_number, email)
          )
        `)
        .eq('child_id', row.children?.child_id)
        .single();
      
      if (error) throw error;
      
      setSelectedChildForView(childData);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching child details:', error);
      toast.error('Failed to load child details');
    }
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
      <div className="mt-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-600">
            Search Results ({searchResults.length})
          </h4>
          <div className="flex items-center gap-2">
            {selectedChildren.length > 0 && (
              <span className="text-xs text-gray-500">
                {selectedChildren.length} selected
              </span>
            )}
            {searchResults.length > 0 && (
              <button
                onClick={selectedChildren.length === searchResults.length ? deselectAllChildren : selectAllChildren}
                className="text-xs text-nextgen-blue hover:text-nextgen-blue-dark transition-colors"
              >
                {selectedChildren.length === searchResults.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1">
          {searchResults.map(child => (
            <div 
              key={child.child_id} 
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                selectedChildren.includes(child.child_id) 
                  ? 'bg-nextgen-blue/10 hover:bg-nextgen-blue/20' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => toggleChildSelection(child.child_id)}
            >
              <input
                type="checkbox"
                checked={selectedChildren.includes(child.child_id)}
                onChange={() => toggleChildSelection(child.child_id)}
                className="h-4 w-4 rounded border-gray-300 text-nextgen-blue focus:ring-nextgen-blue cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              {child.photo_url ? (
                !isInvalidImage(child.photo_url) ? (
                  <img
                    src={child.photo_url}
                    alt={`${child.first_name} ${child.last_name}`}
                    className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      markInvalidImage(child.photo_url);
                    }}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-nextgen-blue/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-nextgen-blue-dark font-medium text-xs">
                      {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                    </span>
                  </div>
                )
              ) : (
                <div className="h-8 w-8 rounded-full bg-nextgen-blue/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-nextgen-blue-dark font-medium text-xs">
                    {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
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
          ))}
        </div>
        {selectedChildren.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCheckInMultiple}
              fullWidth
            >
              Check In {selectedChildren.length} {selectedChildren.length === 1 ? 'Child' : 'Children'}
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  // Define table columns for currently checked-in children
  const checkedInColumns = [
    {
      header: "ID",
      accessor: row => row.children?.formal_id || 'N/A',
      cellClassName: "font-medium text-gray-900",
      width: "100px",
      sortable: true,
      sortKey: "children.formal_id"
    },
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          {row.children?.photo_url ? (
            !isInvalidImage(row.children.photo_url) ? (
              <img
                src={row.children.photo_url}
                alt={`${row.children?.first_name} ${row.children?.last_name}`}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  markInvalidImage(row.children.photo_url);
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center flex-shrink-0">
                <span className="text-nextgen-blue-dark font-medium text-sm">
                  {row.children?.first_name?.charAt(0)}{row.children?.last_name?.charAt(0)}
                </span>
              </div>
            )
          ) : (
            <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center flex-shrink-0">
              <span className="text-nextgen-blue-dark font-medium text-sm">
                {row.children?.first_name?.charAt(0)}{row.children?.last_name?.charAt(0)}
              </span>
            </div>
          )}
          <div className="font-medium text-gray-900 truncate">
            {row.children?.first_name} {row.children?.last_name}
          </div>
        </div>
      ),
      width: "250px",
      sortable: true,
      sortKey: "children.first_name"
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
      width: "180px",
      sortable: true,
      sortKey: "children.birthdate"
    },
    {
      header: "Check In",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant="primary" size="xs">
            In
          </Badge>
          <div className="flex flex-col text-xs">
            <span className="text-gray-900 font-medium">{formatTime(row.check_in_time)}</span>
            <span className="text-gray-500">by {formatStaffName(row.checked_in_by)}</span>
          </div>
        </div>
      ),
      width: "180px",
      sortable: true,
      sortKey: "check_in_time"
    },
    {
      header: "Check Out",
      cell: (row) => row.check_out_time ? (
        <div className="flex items-center gap-2">
          <Badge variant="success" size="xs">
            Out
          </Badge>
          <div className="flex flex-col text-xs">
            <span className="text-gray-900 font-medium">{formatTime(row.check_out_time)}</span>
            <span className="text-gray-500">by {formatStaffName(row.checked_out_by)}</span>
          </div>
        </div>
      ) : (
        <Badge variant="warning" size="xs">
          Pending
        </Badge>
      ),
      width: "180px",
      sortable: true,
      sortKey: "check_out_time"
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex justify-start gap-1">
          {/* Desktop: Show all buttons */}
          <div className="hidden sm:flex gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleEditChild(row.children);
              }}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              title="Edit Child"
            />
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFromAttendance(row);
              }}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
              title="Remove from Attendance"
            />
            <Button
              variant="danger"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleCheckOut(row.attendance_id);
              }}
              disabled={!!row.check_out_time}
              title="Check Out"
            >
              Check Out
            </Button>
          </div>

          {/* Mobile: Compact view - only show checkout button + menu for other actions */}
          <div className="flex sm:hidden gap-1 w-full">
            <Button
              variant="danger"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleCheckOut(row.attendance_id);
              }}
              disabled={!!row.check_out_time}
              className="flex-1 text-xs"
            >
              {row.check_out_time ? '✓' : 'Out'}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="xs"
                className="px-2"
                title="More actions"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMobileMenu(openMobileMenu === row.attendance_id ? null : row.attendance_id);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="5" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="10" cy="15" r="1.5" />
                </svg>
              </Button>
              {openMobileMenu === row.attendance_id && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-40 min-w-max">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditChild(row.children);
                      setOpenMobileMenu(null);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromAttendance(row);
                      setOpenMobileMenu(null);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      width: "150px"
    }
  ];

  // Add this function to handle QR scan results
  const handleQRScanSuccess = useCallback(async (scannedId) => {
    if (!selectedService || !selectedDate) {
      setError('Please select a service and date first');
      return null;
    }
    
    try {
      // Try to find a child with this formal ID - fetch more details for display
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select(`
          child_id, 
          first_name, 
          middle_name,
          last_name, 
          nickname,
          formal_id,
          birthdate,
          gender,
          photo_url,
          age_categories(category_name)
        `)
        .eq('formal_id', scannedId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (childError) throw childError;
      
      if (!childData) {
        setError(`No child found with ID: ${scannedId}`);
        return null;
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
      
      // Calculate age
      const birthDate = new Date(childData.birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Prepare child info for display
      const childInfo = {
        fullName: `${childData.first_name}${childData.middle_name ? ' ' + childData.middle_name : ''} ${childData.last_name}`,
        nickname: childData.nickname,
        formalId: childData.formal_id,
        age: age,
        ageGroup: childData.age_categories?.category_name,
        gender: childData.gender,
        photo_url: childData.photo_url,
        initials: `${childData.first_name?.charAt(0)}${childData.last_name?.charAt(0)}`,
        action: null // Will be set below
      };
      
      if (existingCheckIn) {
        // Child is already checked in
        if (existingCheckIn.check_out_time) {
          // Already checked out
          toast.error(`${childData.first_name} ${childData.last_name} is already checked out`, {
            duration: 2500
          });
          return {
            modalError: `${childData.first_name} ${childData.last_name} is already checked out`
          };
        } else {
          // Checked in but not out - perform check out
          await handleCheckOut(existingCheckIn.attendance_id);
          
          // Show success message
          setError(null);
          toast.success(`${childData.first_name} checked OUT`, {
            duration: 2000,
            variant: 'nextgen'
          });
          
          childInfo.action = 'check-out';
        }
      } else {
        // Not checked in yet - perform check in
        await handleCheckIn(childData.child_id);
        
        // Show success message
        setError(null);
        toast.success(`${childData.first_name} checked IN`, {
          duration: 2000
        });
        
        childInfo.action = 'check-in';
      }
    
      // Refresh the checked-in list
      await fetchCheckedInChildren();
      
      // Return child info to display in modal
      return childInfo;
      
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setError(`Failed to process scan: ${error.message}`);
      return null;
    }
  }, [selectedService, selectedDate, handleCheckIn, handleCheckOut, fetchCheckedInChildren]);

  // Handle edit child
  const handleEditChild = (child) => {
    setSelectedChildForEdit(child);
    setIsEditModalOpen(true);
  };

  // Handle edit success
  const handleEditSuccess = async () => {
    setIsEditModalOpen(false);
    setSelectedChildForEdit(null);
    
    // Refresh the checked-in list to show updated data
    await fetchCheckedInChildren();
    
    toast({
      title: "Success",
      description: "Child information updated successfully",
      variant: "success"
    });
  };

  // Handle remove from attendance
  const handleRemoveFromAttendance = (row) => {
    setAttendanceToRemove(row);
    setShowRemoveDialog(true);
  };

  // Confirm remove from attendance
  const confirmRemoveFromAttendance = async () => {
    if (!attendanceToRemove) return;
    
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('attendance_id', attendanceToRemove.attendance_id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${attendanceToRemove.children?.first_name} ${attendanceToRemove.children?.last_name} removed from attendance`,
        variant: "success"
      });
      
      // Refresh the checked-in list
      await fetchCheckedInChildren();
      
      setShowRemoveDialog(false);
      setAttendanceToRemove(null);
    } catch (error) {
      console.error('Error removing from attendance:', error);
      toast({
        title: "Error",
        description: "Failed to remove child from attendance",
        variant: "error"
      });
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
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                {/* Service Select */}
                <div className="w-full md:w-72">
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
                    className="h-[42px] !mb-0"
                  />
                </div>

                {/* Date Input */}
                <div className="w-full md:w-48">
                  <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <DatePickerOverlay
                    id="date-select"
                    value={selectedDate}
                    onChange={setSelectedDate}
                  />
                </div>

                {/* Search Input - Modified with QR button */}
                <div className="w-full md:flex-1 flex flex-col">
                  <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Child
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        id="search-input"
                        placeholder="Search by name, ID, or nickname..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedService}
                        className="h-[42px] !mb-0"
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
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedChildren([]);
                            }}
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
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4 flex justify-between items-center">
                <span>Currently Checked In</span>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-medium">Total:</span>
                      <span className="text-gray-900 font-semibold">{checkedInList.length}</span>
                    </div>
                    {checkedInList.length > 0 && (
                      <>
                        <div className="w-px h-5 bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Pending:</span>
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            {checkedInList.filter(item => !item.check_out_time).length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {checkedInList.filter(item => !item.check_out_time).length > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowCheckOutAllDialog(true)}
                    >
                      Check Out All
                    </Button>
                  )}
                </div>
              </h3>
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <Table
                  data={sortedCheckedInList}
                  columns={checkedInColumns}
                  isLoading={loading}
                  noDataMessage="No children checked in for this service"
                  highlightOnHover={true}
                  variant="primary"
                  stickyHeader={true}
                  size="md"
                  sortable={true}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onRowClick={handleRowClick}
                  mobileCollapsible={true}
                  getRowClassName={(row) => !row.check_out_time ? 'bg-yellow-50 hover:bg-yellow-100' : ''}
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
      
      {/* Check Out All Dialog */}
      <Dialog open={showCheckOutAllDialog} onOpenChange={setShowCheckOutAllDialog}>
        <DialogContent onClose={() => setShowCheckOutAllDialog(false)}>
          <DialogHeader>
            <DialogTitle>Check Out All Children?</DialogTitle>
            <DialogDescription>
              This will check out {checkedInList.filter(item => !item.check_out_time).length} children.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckOutAllDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleCheckOutAll}
            >
              Yes, check out all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Child Detail View Modal */}
      <ChildDetailView
        child={selectedChildForView}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedChildForView(null);
        }}
        onPrintID={() => {
          const mappedData = {
            firstName: selectedChildForView.first_name,
            lastName: selectedChildForView.last_name,
            nickname: selectedChildForView.nickname || '',
            middleName: selectedChildForView.middle_name || '',
            formalId: selectedChildForView.formal_id || 'N/A',
            gender: selectedChildForView.gender,
            birthdate: selectedChildForView.birthdate,
            age: Math.floor((new Date() - new Date(selectedChildForView.birthdate)) / 31557600000),
            ageCategory: selectedChildForView.age_categories?.category_name || 'N/A',
            guardianFirstName: selectedChildForView.child_guardian?.[0]?.guardians?.first_name || '',
            guardianLastName: selectedChildForView.child_guardian?.[0]?.guardians?.last_name || '',
            guardianPhone: selectedChildForView.child_guardian?.[0]?.guardians?.phone_number || '',
            guardianEmail: selectedChildForView.child_guardian?.[0]?.guardians?.email || '',
            photoUrl: selectedChildForView.photo_url || '',
            registrationDate: selectedChildForView.registration_date
          };

          const validation = getPrintableIdValidation(mappedData);
          if (!validation.isValid) {
            toast.error('Cannot Print ID', {
              description: `Missing required info: ${validation.missingFields.join(', ')}`,
            });
            return;
          }

          setIsViewModalOpen(false);
          setSelectedChildForView(null);
          setRegisteredChildData(mappedData);
          setTimeout(() => setShowPrintableID(true), 100);
        }}
        onShowQR={() => {
          setIsViewModalOpen(false);
          setSelectedChildForView(null);
          setRegisteredChildData({
            firstName: selectedChildForView.first_name,
            lastName: selectedChildForView.last_name,
            nickname: selectedChildForView.nickname || '',
            middleName: selectedChildForView.middle_name || '',
            formalId: selectedChildForView.formal_id || 'N/A',
            gender: selectedChildForView.gender,
            birthdate: selectedChildForView.birthdate,
            age: Math.floor((new Date() - new Date(selectedChildForView.birthdate)) / 31557600000),
            ageCategory: selectedChildForView.age_categories?.category_name || 'N/A',
            guardianFirstName: selectedChildForView.child_guardian?.[0]?.guardians?.first_name || '',
            guardianLastName: selectedChildForView.child_guardian?.[0]?.guardians?.last_name || '',
            guardianPhone: selectedChildForView.child_guardian?.[0]?.guardians?.phone_number || '',
            guardianEmail: selectedChildForView.child_guardian?.[0]?.guardians?.email || '',
            photoUrl: selectedChildForView.photo_url || '',
            registrationDate: selectedChildForView.registration_date
          });
          setTimeout(() => setShowQRModal(true), 100);
        }}
      />

      {/* QR Code Modal (from Show QR button) */}
      {showQRModal && registeredChildData && (
        <RegistrationSuccessModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          childData={registeredChildData}
          onPrintID={() => {
            const validation = getPrintableIdValidation(registeredChildData);
            if (!validation.isValid) {
              toast.error('Cannot Print ID', {
                description: `Missing required info: ${validation.missingFields.join(', ')}`,
              });
              return;
            }

            setShowQRModal(false);
            setTimeout(() => setShowPrintableID(true), 100);
          }}
        />
      )}

      {/* Printable ID Card Component */}
      {showPrintableID && registeredChildData && (
        <PrintableIDCard 
          childData={registeredChildData}
          onClose={() => setShowPrintableID(false)}
        />
      )}

      {/* Edit Child Form Modal */}
      {isEditModalOpen && selectedChildForEdit && (
        <AddChildForm
          isEdit={true}
          initialData={selectedChildForEdit}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedChildForEdit(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Remove from Attendance Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Attendance?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {attendanceToRemove?.children?.first_name} {attendanceToRemove?.children?.last_name} from this attendance session? This will delete their attendance record for this date and service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveDialog(false);
                setAttendanceToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmRemoveFromAttendance}
            >
              Yes, remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;