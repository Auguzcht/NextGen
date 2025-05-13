import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase, { supabaseAdmin } from '../services/supabase.js';
import StaffList from '../components/staff/StaffList.jsx';
import StaffForm from '../components/staff/StaffForm.jsx';
import StaffDetailView from '../components/staff/StaffDetailView.jsx';
import StaffAssignmentForm from '../components/staff/StaffAssignmentForm.jsx';
import StaffAssignmentsList from '../components/staff/StaffAssignmentsList.jsx';
import { Card, Button, Input } from '../components/ui';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

const StaffManagementPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
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

  // Initialize the active tab based on URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['list', 'assignments'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/staff?tab=${tab}`, { replace: true });
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchStaffMembers();
    }
  }, [activeTab]);

  useEffect(() => {
    // Debounce search when on list tab
    if (activeTab === 'list') {
      const timer = setTimeout(() => {
        fetchStaffMembers();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab]);

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

  // Get icon based on active tab
  const getTabIcon = () => {
    switch (activeTab) {
      case 'list':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'assignments':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'list':
        return (
          <div className="space-y-6">
            {/* Improved search and add staff layout */}
            <div className="flex flex-col md:flex-row gap-4 md:items-end mb-0">
              <div className="flex-grow w-full">
                <label htmlFor="staff-search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Staff
                </label>
                <Input
                  id="staff-search"
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  }
                  fullWidth
                  className="h-10"
                />
              </div>
              
              <div className="w-full md:w-auto flex-shrink-0 md:self-end md:pb-[16px]">
                <Button
                  variant="primary"
                  onClick={() => setIsAddModalOpen(true)}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  }
                  className="h-10 w-full md:w-auto"
                >
                  Add Staff
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
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

            {/* Quick access to staff schedule overview */}
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">Staff Schedule Overview</h3>
              <p className="mb-4 text-gray-600">View and manage upcoming staff assignments</p>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-gray-600">Total Active Staff: </span>
                  <span className="font-medium">{staffMembers.filter(s => s.is_active).length}</span>
                </div>
                
                <Button
                  variant="primary"
                  onClick={() => handleTabChange('assignments')}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  }
                >
                  View Assignments
                </Button>
              </div>
            </div>
          </div>
        );
        
      case 'assignments':
        return (
          <div className="space-y-6">
            {/* Modified StaffAssignmentsList component will handle the add button inside */}
            <StaffAssignmentsList 
              onAddClick={() => setIsAssignmentModalOpen(true)}
            />
          </div>
        );
        
      default:
        return <div>Select a tab to view staff management options</div>;
    }
  };

  return (
    <div className="page-container">
      <Card
        title="Staff Management"
        titleColor="text-nextgen-blue-dark"
        variant="default"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      >
        <div className="border-b border-gray-200 -mt-2">
          <div className="flex space-x-2 md:space-x-6">
            <Button
              variant={activeTab === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('list')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              iconPosition="left"
            >
              Staff List
            </Button>
            
            <Button
              variant={activeTab === 'assignments' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('assignments')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              iconPosition="left"
            >
              Assignments
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
          <div className="flex items-center mb-6">
            {getTabIcon()}
            <h2 className="text-xl font-semibold text-nextgen-blue-dark ml-2">
              {activeTab === 'list' ? 'Staff List' : 'Staff Assignments'}
            </h2>
          </div>
          
          {renderTabContent()}
        </motion.div>
      </Card>

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