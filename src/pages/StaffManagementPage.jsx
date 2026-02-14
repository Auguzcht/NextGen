import { useState, useEffect, useMemo } from 'react';
import supabase from '../services/supabase.js';
import useImageCache from '../hooks/useImageCache.jsx';
import StaffForm from '../components/staff/StaffForm.jsx';
import StaffDetailView from '../components/staff/StaffDetailView.jsx';
import SendCredentialsModal from '../components/staff/SendCredentialsModal.jsx';
import BatchCredentialCreation from '../components/staff/BatchCredentialCreation.jsx';
import { Card, Button, Badge, Table, Input, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

const StaffManagementPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staffMembers, setStaffMembers] = useState([]);
  const [allStaff, setAllStaff] = useState([]); // Full staff list for modals
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSendCredentialsModalOpen, setIsSendCredentialsModalOpen] = useState(false);
  const [isBatchCredentialModalOpen, setIsBatchCredentialModalOpen] = useState(false);
  
  // Dialog states
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [staffToToggle, setStaffToToggle] = useState(null);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('first_name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Image caching
  const { cacheImages } = useImageCache();

  // Debounce search query
  useEffect(() => {
    if (searchQuery === '') {
      setDebouncedSearchQuery('');
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchStaffMembers();
    fetchAllStaff(); // Fetch all staff for modals
  }, [debouncedSearchQuery, currentPage, sortBy, sortOrder]);

  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('staff')
        .select('staff_id, user_id, first_name, last_name, email, phone_number, role, is_active, access_level, created_date, profile_image_url, profile_image_path') // Added profile_image fields
        .order(sortBy, { ascending: sortOrder === 'asc' });
      
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        query = query.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%,role.ilike.%${debouncedSearchQuery}%`);
      }

      // Get total count for pagination
      let countQuery = supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });
      
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        countQuery = countQuery.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%,role.ilike.%${debouncedSearchQuery}%`);
      }
      
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      
      // Apply pagination
      query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      const { data, error } = await query;

      if (error) throw error;
      
      // console.log('Fetched staff with images:', data); // Debug log
      setStaffMembers(data || []);
      
      // Cache all staff profile images
      if (data && data.length > 0) {
        const photoUrls = data
          .map(staff => staff.profile_image_url)
          .filter(url => url);
        cacheImages(photoUrls);
      }
    } catch (error) {
      console.error('Error fetching staff members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all staff (unpaginated) for modals
  const fetchAllStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('staff_id, user_id, first_name, last_name, email, phone_number, role, is_active, access_level, credentials_sent_at, credentials_sent_count, last_login_at')
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setAllStaff(data || []);
    } catch (error) {
      console.error('Error fetching all staff:', error);
    }
  };

  const fetchStaffStats = async (staffId) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all data in parallel
      const [totalResult, upcomingResult, servicesResult, assignmentsResult] = await Promise.all([
        // Total assignments
        supabase
          .from('staff_assignments')
          .select('assignment_id', { count: 'exact', head: true })
          .eq('staff_id', staffId),
        
        // Upcoming assignments
        supabase
          .from('staff_assignments')
          .select('assignment_id', { count: 'exact', head: true })
          .eq('staff_id', staffId)
          .gte('assignment_date', today),
        
        // Unique services
        supabase
          .from('staff_assignments')
          .select('service_id')
          .eq('staff_id', staffId),
        
        // Most recent assignments (get multiple to group)
        supabase
          .from('staff_assignments')
          .select(`
            *,
            services(service_id, service_name, day_of_week, start_time)
          `)
          .eq('staff_id', staffId)
          .order('assignment_date', { ascending: false })
          .limit(10)
      ]);

      if (totalResult.error) throw totalResult.error;
      if (upcomingResult.error) throw upcomingResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      // Count unique services
      const uniqueServices = new Set();
      servicesResult.data?.forEach(item => uniqueServices.add(item.service_id));

      // Get the most recent assignment (single service with latest time on the most recent date)
      let mostRecentAssignment = null;
      
      if (assignmentsResult.data && assignmentsResult.data.length > 0) {
        // Sort by date desc, then by start_time desc to get the absolute most recent
        const sortedAssignments = [...assignmentsResult.data].sort((a, b) => {
          const dateCompare = new Date(b.assignment_date) - new Date(a.assignment_date);
          if (dateCompare !== 0) return dateCompare;
          
          // If same date, compare by service start time
          const timeA = a.services?.start_time || '00:00:00';
          const timeB = b.services?.start_time || '00:00:00';
          return timeB.localeCompare(timeA);
        });
        
        mostRecentAssignment = sortedAssignments[0];
      }

      return {
        totalAssignments: totalResult.count || 0,
        upcomingAssignments: upcomingResult.count || 0,
        servicesWorked: uniqueServices.size,
        recentAssignment: mostRecentAssignment
      };
    } catch (error) {
      console.error('Error fetching staff stats:', error);
      return {
        totalAssignments: 0,
        upcomingAssignments: 0,
        servicesWorked: 0,
        recentAssignment: null
      };
    }
  };

  const handleViewStaff = async (staff) => {
    // Show modal immediately with staff data (including profile image)
    setSelectedStaff({
      ...staff,
      stats: null,
      recentAssignment: null
    });
    setIsViewModalOpen(true);

    // Fetch stats in background
    const stats = await fetchStaffStats(staff.staff_id);
    
    // Update staff data with stats (preserve profile image URLs)
    setSelectedStaff({
      ...staff,
      stats: {
        totalAssignments: stats.totalAssignments,
        upcomingAssignments: stats.upcomingAssignments,
        servicesWorked: stats.servicesWorked
      },
      recentAssignment: stats.recentAssignment
    });
  };

  const handleEditStaff = (staff) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const handleToggleActive = (staff) => {
    setStaffToToggle(staff);
    setShowToggleDialog(true);
  };

  const confirmToggleActive = async () => {
    if (!staffToToggle) return;
    
    const isActivating = !staffToToggle.is_active;
    
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: isActivating })
        .eq('staff_id', staffToToggle.staff_id);

      if (error) throw error;

      toast.success(
        isActivating ? 'Reactivated!' : 'Deactivated!',
        { description: `The staff member has been ${isActivating ? 'reactivated' : 'deactivated'}.` }
      );
      
      setShowToggleDialog(false);
      setStaffToToggle(null);
      fetchStaffMembers();
    } catch (error) {
      toast.error('Error!', {
        description: `Failed to ${isActivating ? 'reactivate' : 'deactivate'} staff member.`
      });
      console.error('Error toggling staff status:', error);
    }
  };

  const handleEditSuccess = async () => {
    await fetchStaffMembers();
    setIsEditModalOpen(false);
    setSelectedStaff(null);
    
    toast.success('Updated!', {
      description: 'Staff information has been updated.',
      duration: 1500
    });
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  // Define table columns
  const columns = useMemo(() => [
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
            {row.profile_image_url ? (
              <img 
                src={row.profile_image_url}
                alt={`${row.first_name} ${row.last_name}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const gradient = getStaffGradient(row.staff_id);
                  e.target.parentNode.innerHTML = `
                    <div class="h-full w-full rounded-full ${gradient} flex items-center justify-center text-white font-medium">
                      ${row.first_name?.charAt(0) || ''}${row.last_name?.charAt(0) || ''}
                    </div>
                  `;
                }}
              />
            ) : (
              <div className={`h-full w-full rounded-full ${getStaffGradient(row.staff_id)} flex items-center justify-center text-white font-medium`}>
                {row.first_name?.charAt(0) || '?'}
                {row.last_name?.charAt(0) || ''}
              </div>
            )}
          </div>
          <div className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </div>
        </div>
      ),
      width: "250px",
      sortable: true,
      sortKey: "first_name"
    },
    {
      header: "Contact",
      cell: (row) => (
        <div>
          {row.email && (
            <div className="text-nextgen-blue text-sm">{row.email}</div>
          )}
          {row.phone && (
            <div className="text-gray-600 text-sm">{row.phone}</div>
          )}
        </div>
      ),
      width: "200px",
      sortable: true,
      sortKey: "email"
    },
    {
      header: "Role",
      cell: (row) => (
        <Badge variant="primary" size="sm">
          {row.role}
        </Badge>
      ),
      width: "120px",
      sortable: true,
      sortKey: "role"
    },
    {
      header: "Access",
      cell: (row) => row.access_level || 'N/A',
      width: "100px",
      sortable: true,
      sortKey: "access_level"
    },
    {
      header: "Status",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge 
            variant={row.is_active ? "success" : "danger"}
            size="sm"
          >
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {row.user_id && (
            <Badge variant="secondary" size="sm">
              Has Login
            </Badge>
          )}
        </div>
      ),
      width: "120px",
      sortable: true,
      sortKey: "is_active"
    },
    {
      header: "Actions",
      cellClassName: "text-end",
      cell: (row) => (
        <div className="flex justify-start gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleEditStaff(row);
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          {row.email !== 'admin@example.com' && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(row);
              }}
              icon={
                row.is_active ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
              title={row.is_active ? 'Deactivate' : 'Reactivate'}
            />
          )}
        </div>
      ),
      width: "120px"
    }
  ], []);

  // Add gradient generator function before the columns definition
  const getStaffGradient = (staffId) => {
    const colors = [
      'from-nextgen-blue to-nextgen-blue-dark',
      'from-nextgen-orange to-nextgen-orange-dark',
      'from-nextgen-blue-light to-nextgen-blue',
      'from-nextgen-orange-light to-nextgen-orange',
      'from-blue-500 to-indigo-600',
      'from-orange-500 to-amber-500'
    ];
    
    const index = (staffId || 0) % colors.length;
    return `bg-gradient-to-br ${colors[index]}`;
  };

  // Modern pagination with ellipsis (shadcn style)
  const renderPagination = () => {
    const getVisiblePages = () => {
      const delta = 2; // Number of pages to show on each side of current page
      const range = [];
      const rangeWithDots = [];

      // Always show first page
      range.push(1);

      // Add pages around current page
      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      // Always show last page if more than 1 page
      if (totalPages > 1) {
        range.push(totalPages);
      }

      // Remove duplicates and sort
      const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

      // Add ellipsis where needed
      let prev = 0;
      for (const page of uniqueRange) {
        if (page - prev === 2) {
          rangeWithDots.push(prev + 1);
        } else if (page - prev !== 1) {
          rangeWithDots.push('...');
        }
        rangeWithDots.push(page);
        prev = page;
      }

      return rangeWithDots;
    };

    return (
      <div className="flex items-center justify-between mt-4">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, (totalPages * itemsPerPage))}
            </span>{' '}
            of <span className="font-medium">{totalPages * itemsPerPage}</span> results
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          
          {getVisiblePages().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-nextgen-blue-dark">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "primary" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-w-[40px] px-3 py-2"
              >
                {page}
              </Button>
            )
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">

      <Card
        variant="default"
        title="Staff Management"
        titleColor="text-nextgen-blue-dark"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              endIcon={isSearching ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              fullWidth
            />
          </div>
          
          <div className="flex gap-2">
            {user?.access_level >= 10 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsBatchCredentialModalOpen(true)}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                    </svg>
                  }
                >
                  Create Accounts
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsSendCredentialsModalOpen(true)}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  }
                >
                  Send Access Emails
                </Button>
              </>
            )}
            
            <Button
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              }
            >
              Add Staff
            </Button>
          </div>
        </div>

        <motion.div
          key={currentPage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden"
        >
          <Table
            data={staffMembers}
            columns={columns}
            isLoading={loading}
            noDataMessage="No staff members found"
            highlightOnHover={true}
            variant="primary"
            stickyHeader={true}
            onRowClick={(row) => handleViewStaff(row)}
            sortable={true}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </motion.div>
        
        {renderPagination()}
      </Card>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <StaffForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchStaffMembers();
          }}
        />
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && selectedStaff && (
        <StaffForm
          isEdit={true}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStaff(null);
          }}
          onSuccess={handleEditSuccess}
          initialData={selectedStaff}
        />
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedStaff && (
        <StaffDetailView
          staff={selectedStaff}
          staffId={selectedStaff.staff_id}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedStaff(null);
          }}
        />
      )}

      {/* Send Credentials Modal */}
      <SendCredentialsModal
        isOpen={isSendCredentialsModalOpen}
        onClose={() => setIsSendCredentialsModalOpen(false)}
        staffMembers={allStaff}
      />

      {/* Batch Credential Creation Modal */}
      <BatchCredentialCreation
        isOpen={isBatchCredentialModalOpen}
        onClose={() => setIsBatchCredentialModalOpen(false)}
        staffMembers={allStaff}
        onSuccess={() => {
          fetchStaffMembers();
          fetchAllStaff();
        }}
      />

      {/* Toggle Active/Inactive Confirmation Dialog */}
      <Dialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {staffToToggle && !staffToToggle.is_active ? (
                "This will reactivate the staff member and allow them to log in."
              ) : (
                "This will deactivate the staff member and prevent them from logging in."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowToggleDialog(false);
                setStaffToToggle(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={staffToToggle && !staffToToggle.is_active ? "success" : "warning"}
              onClick={confirmToggleActive}
            >
              {staffToToggle && !staffToToggle.is_active ? "Yes, reactivate" : "Yes, deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagementPage;