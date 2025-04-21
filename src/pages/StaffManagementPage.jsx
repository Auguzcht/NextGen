import { useState, useEffect } from 'react';
import supabase, { supabaseAdmin } from '../services/supabase.js'; // Import supabaseAdmin
import StaffList from '../components/staff/StaffList.jsx';
import StaffForm from '../components/staff/StaffForm.jsx';
import StaffDetailView from '../components/staff/StaffDetailView.jsx';
import StaffAssignmentForm from '../components/staff/StaffAssignmentForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const StaffManagementPage = () => {
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isUserCredentialsModalOpen, setIsUserCredentialsModalOpen] = useState(false);
  const [viewingStaffId, setViewingStaffId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedStaffForCredentials, setSelectedStaffForCredentials] = useState(null);
  const [credentialsStatus, setCredentialsStatus] = useState({ loading: false, error: null, success: null });

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchStaffMembers();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStaffMembers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('staff')
        .select('*')
        .order('last_name');
      
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStaff = (staffId) => {
    setViewingStaffId(staffId);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setIsAddModalOpen(true);
  };

  const handleCloseDetailView = () => {
    setViewingStaffId(null);
  };

  const handleCloseForm = () => {
    setIsAddModalOpen(false);
    setEditingStaff(null);
  };

  const handleCreateUserCredentials = (staff) => {
    setSelectedStaffForCredentials(staff);
    setIsUserCredentialsModalOpen(true);
  };

  const handleCreateUser = async (password) => {
    if (!selectedStaffForCredentials) return;
    
    setCredentialsStatus({ loading: true, error: null, success: null });
    
    try {
      // Use supabaseAdmin instead of supabase for auth.admin functions
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

      // Update staff record with user_id
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
      
      // Refresh staff list
      fetchStaffMembers();
      
      // Close modal after 3 seconds
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

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Staff Management</h2>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors whitespace-nowrap"
              >
                Add Staff
              </button>
              
              <button
                onClick={() => setIsAssignmentModalOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Assign Staff
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <StaffList 
            staffMembers={staffMembers} 
            onRefresh={fetchStaffMembers}
            onView={handleViewStaff}
            onEdit={handleEditStaff}
            onCreateCredentials={handleCreateUserCredentials}
          />
        )}
      </div>

      {/* Quick access to staff schedule overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Staff Schedule Overview</h3>
        <p className="mb-4 text-gray-600">View and manage upcoming staff assignments</p>
        
        <div className="flex justify-between items-center">
          <div>
            <span className="text-gray-600">Total Active Staff: </span>
            <span className="font-medium">{staffMembers.filter(s => s.is_active).length}</span>
          </div>
          
          <div>
            <a 
              href="/staff-schedule"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Schedule
              <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Add/Edit Staff Modal */}
      {isAddModalOpen && (
        <StaffForm
          initialData={editingStaff}
          onClose={handleCloseForm}
          onSuccess={fetchStaffMembers}
        />
      )}

      {/* Staff Assignment Modal */}
      {isAssignmentModalOpen && (
        <StaffAssignmentForm
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          onSuccess={() => {
            // After successfully assigning staff, we don't need to refresh the staff list
            // as assignments are not displayed here
            setIsAssignmentModalOpen(false);
          }}
        />
      )}

      {/* Staff Detail View */}
      {viewingStaffId && (
        <StaffDetailView
          staffId={viewingStaffId}
          isOpen={Boolean(viewingStaffId)}
          onClose={handleCloseDetailView}
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
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  minLength="8"
                  required
                />
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Credentials
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StaffManagementPage;