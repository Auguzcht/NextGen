import { useState, useEffect, useCallback, useMemo } from 'react';
import supabase, { supabaseAdmin } from '../services/supabase.js';
import StaffForm from '../components/staff/StaffForm.jsx';
import StaffDetailView from '../components/staff/StaffDetailView.jsx';
import { Card, Button, Badge, Table, Input } from '../components/ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const StaffManagementPage = () => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserCredentialsModalOpen, setIsUserCredentialsModalOpen] = useState(false);
  const [selectedStaffForCredentials, setSelectedStaffForCredentials] = useState(null);
  const [credentialsStatus, setCredentialsStatus] = useState({ loading: false, error: null, success: null });

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

  useEffect(() => {
    fetchStaffMembers();
  }, [debouncedSearchQuery]);

  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('staff')
        .select('staff_id, user_id, first_name, last_name, email, phone_number, role, is_active, access_level, created_date, profile_image_url, profile_image_path') // Added profile_image fields
        .order('last_name');
      
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        query = query.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%,role.ilike.%${debouncedSearchQuery}%`);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Fetched staff with images:', data); // Debug log
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    } finally {
      setLoading(false);
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
        
        // Most recent assignment
        supabase
          .from('staff_assignments')
          .select(`
            *,
            services(service_name, day_of_week, start_time)
          `)
          .eq('staff_id', staffId)
          .order('assignment_date', { ascending: false })
          .limit(1)
      ]);

      if (totalResult.error) throw totalResult.error;
      if (upcomingResult.error) throw upcomingResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      // Count unique services
      const uniqueServices = new Set();
      servicesResult.data?.forEach(item => uniqueServices.add(item.service_id));

      return {
        totalAssignments: totalResult.count || 0,
        upcomingAssignments: upcomingResult.count || 0,
        servicesWorked: uniqueServices.size,
        recentAssignment: assignmentsResult.data?.[0] || null
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

  const handleDeleteStaff = async (staff) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will deactivate the staff member. This can be undone later.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, deactivate',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('staff')
          .update({ is_active: false })
          .eq('staff_id', staff.staff_id);

        if (error) throw error;

        Swal.fire(
          'Deactivated!',
          'The staff member has been deactivated.',
          'success'
        );
        fetchStaffMembers();
      } catch (error) {
        Swal.fire(
          'Error!',
          'Failed to deactivate staff member.',
          'error'
        );
        console.error('Error deactivating staff:', error);
      }
    }
  };

  const handleCreateUserCredentials = (staff) => {
    setSelectedStaffForCredentials(staff);
    setIsUserCredentialsModalOpen(true);
  };

  const handleCreateUser = async (password) => {
    if (!selectedStaffForCredentials) return;
    
    setCredentialsStatus({ loading: true, error: null, success: null });
    
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: selectedStaffForCredentials.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: selectedStaffForCredentials.first_name,
          last_name: selectedStaffForCredentials.last_name,
          role: selectedStaffForCredentials.role
        }
      });

      if (authError) throw authError;

      const { error: updateError } = await supabase
        .from('staff')
        .update({ user_id: authData.user.id })
        .eq('staff_id', selectedStaffForCredentials.staff_id);

      if (updateError) throw updateError;

      setCredentialsStatus({ 
        loading: false, 
        error: null, 
        success: `Login credentials created successfully for ${selectedStaffForCredentials.first_name} ${selectedStaffForCredentials.last_name}` 
      });
      
      fetchStaffMembers();
      
      setTimeout(() => {
        setIsUserCredentialsModalOpen(false);
        setSelectedStaffForCredentials(null);
        setCredentialsStatus({ loading: false, error: null, success: null });
      }, 3000);
      
    } catch (error) {
      console.error('Error creating user credentials:', error);
      setCredentialsStatus({ 
        loading: false, 
        error: error.message || 'Failed to create user credentials', 
        success: null 
      });
    }
  };

  const handleEditSuccess = async () => {
    await fetchStaffMembers();
    setIsEditModalOpen(false);
    setSelectedStaff(null);
    
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'Staff information has been updated.',
      timer: 1500
    });
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
      width: "250px"
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
      width: "200px"
    },
    {
      header: "Role",
      cell: (row) => (
        <Badge variant="primary" size="sm">
          {row.role}
        </Badge>
      ),
      width: "120px"
    },
    {
      header: "Access",
      cell: (row) => row.access_level || 'N/A',
      width: "100px"
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
      width: "120px"
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
          {!row.user_id && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateUserCredentials(row);
              }}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              title="Create login credentials"
            />
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteStaff(row);
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          />
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

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <Table
            data={staffMembers}
            columns={columns}
            isLoading={loading}
            noDataMessage="No staff members found"
            highlightOnHover={true}
            variant="primary"
            stickyHeader={true}
            onRowClick={(row) => handleViewStaff(row)}
          />
        </div>
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

      {/* User Credentials Modal */}
      {isUserCredentialsModalOpen && (
        <UserCredentialsModal
          staff={selectedStaffForCredentials}
          onClose={() => {
            setIsUserCredentialsModalOpen(false);
            setSelectedStaffForCredentials(null);
            setCredentialsStatus({ loading: false, error: null, success: null });
          }}
          onSubmit={handleCreateUser}
          status={credentialsStatus}
        />
      )}
    </div>
  );
};

// User Credentials Modal Component
const UserCredentialsModal = ({ staff, onClose, onSubmit, status }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Create Login Credentials
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={status.loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status.loading ? (
          <div className="px-4 py-5 sm:p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
          </div>
        ) : status.success ? (
          <div className="px-4 py-5 sm:p-6">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{status.success}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              {(error || status.error) && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error || status.error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-700 mb-4">
                  Create login credentials for <span className="font-medium">{staff?.first_name} {staff?.last_name}</span> ({staff?.email})
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
                  minLength="8"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
                  minLength="8"
                  required
                />
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <Button
                variant="ghost"
                onClick={onClose}
                className="mr-3"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Create Credentials
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StaffManagementPage;