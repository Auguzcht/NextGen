import { useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '../services/supabase.js';
import AddChildForm from '../components/children/AddChildForm.jsx';
import { Card, Button, Badge, Table, Input, Modal } from '../components/ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import ChildDetailView from '../components/children/ChildDetailView.jsx';
import RegistrationSuccessModal from '../components/children/RegistrationSuccessModal';
import PrintableIDCard from '../components/children/PrintableIDCard';

const ChildrenPage = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // New state variables
  const [selectedChild, setSelectedChild] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPrintableID, setShowPrintableID] = useState(false);
  const [registeredChildData, setRegisteredChildData] = useState(null);
  const CACHE_DURATION = 60000; // 1 minute in milliseconds

  // Debounce search query
  useEffect(() => {
    // Don't set timer for empty strings or when explicitly clearing
    if (searchQuery === '') {
      setDebouncedSearchQuery('');
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use the debounced search query for fetching
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search query changes
    fetchChildren();
  }, [currentPage, debouncedSearchQuery]);

  const fetchChildren = async (forceFresh = false) => {
    // Check if we can use cached data
    const now = Date.now();
    if (!forceFresh && 
        children.length > 0 && 
        now - lastFetchTime < CACHE_DURATION && 
        !debouncedSearchQuery) {
      return; // Use cached data
    }
    
    setLoading(true);
    try {
      let query = supabase
        .from('children')
        .select(`
          *,
          age_categories(category_name),
          child_guardian!inner(
            guardian_id,
            is_primary,
            guardians(first_name, last_name, phone_number, email)
          )
        `)
        .order('registration_date', { ascending: true });

      // Only apply search filter if there's actually a search query
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        query = query.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,formal_id.ilike.%${debouncedSearchQuery}%`);
      }

      // Get total count for pagination - also only apply search filter if there's a query
      let countQuery = supabase
        .from('children')
        .select('*', { count: 'exact', head: true });
        
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        countQuery = countQuery.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,formal_id.ilike.%${debouncedSearchQuery}%`);
      }
      
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      
      // Apply pagination
      query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST301') {
          // Handle unauthorized access
          throw new Error('Unauthorized access to children records');
        }
        throw error;
      }
      setChildren(data || []);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddChildSuccess = async (childData) => {
    await fetchChildren(); // Wait for fetch to complete
    
    // Set the registered child data and show success modal instead of Swal
    setRegisteredChildData(childData);
    setShowSuccessModal(true);
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

  // For expensive calculations like getting guardian info
  const getPrimaryGuardian = useCallback((childGuardians) => {
    if (!childGuardians || childGuardians.length === 0) return null;
    
    const primaryGuardian = childGuardians.find(cg => cg.is_primary) || childGuardians[0];
    return primaryGuardian.guardians;
  }, []);
  
  // For table columns that don't need to be recreated on every render
  const columns = useMemo(() => [
    {
      header: "ID",
      accessor: "formal_id",
      cellClassName: "font-medium text-gray-900",
      cell: (row) => row.formal_id || 'N/A',
      width: "80px" // Slightly reduced
    },
    {
      header: "Name",
      accessor: (row) => `${row.first_name} ${row.last_name}`,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.photo_url ? (
            <img
              src={row.photo_url}
              alt={`${row.first_name} ${row.last_name}`}
              className="h-10 w-10 rounded-full object-cover"
              loading="lazy" // Add lazy loading
              onError={(e) => {
                e.target.onerror = null; // Prevent infinite loop
                e.target.src = `${import.meta.env.BASE_URL}placeholder-avatar.png`; // Fallback to default image
              }}
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
              <span className="text-nextgen-blue-dark font-medium text-sm">
                {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
              </span>
            </div>
          )}
          <div className="font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </div>
        </div>
      ),
      width: "200px" // Reduced from 300px
    },
    {
      header: "Age / Group",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{calculateAge(row.birthdate)} yrs</span>
          <Badge variant="primary" size="sm">
            {row.age_categories?.category_name || 'Unknown'}
          </Badge>
        </div>
      ),
      width: "180px" // Increased width slightly to accommodate horizontal layout
    },
    {
      header: "Guardian",
      cell: (row) => {
        const primaryGuardian = getPrimaryGuardian(row.child_guardian);
        return primaryGuardian ? (
          <div>
            <div className="text-gray-900 truncate max-w-[150px]">
              {primaryGuardian.first_name} {primaryGuardian.last_name}
            </div>
            <div className="text-gray-600 truncate max-w-[150px]">
              {primaryGuardian.phone_number || primaryGuardian.email || 'No contact'}
            </div>
          </div>
        ) : 'N/A';
      },
      width: "150px" // Combined guardian and contact
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge 
          variant={row.is_active ? "success" : "danger"}
          size="sm"
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      width: "100px" // Slightly reduced
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
              handleEditChild(row);
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteChild(row);
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          />
        </div>
      ),
      width: "100px" // Slightly reduced
    }
  ], [calculateAge, getPrimaryGuardian]); // dependencies

  // Pagination buttons
  const renderPagination = () => {
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
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {[...Array(totalPages)].map((_, i) => (
            <Button
              key={i}
              variant={currentPage === i + 1 ? "primary" : "outline"}
              size="sm"
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  // New handler functions
  const handleViewChild = (child) => {
    setSelectedChild(child);
    setIsViewModalOpen(true);
  };

  const handleEditChild = (child) => {
    setSelectedChild(child);
    setIsEditModalOpen(true);
  };

  const handleDeleteChild = async (child) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will deactivate the child's record. This can be undone later.",
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
          .from('children')
          .update({ is_active: false })
          .eq('child_id', child.child_id);

        if (error) throw error;

        Swal.fire(
          'Deactivated!',
          'The child has been deactivated.',
          'success'
        );
        fetchChildren();
      } catch (error) {
        Swal.fire(
          'Error!',
          'Failed to deactivate child.',
          'error'
        );
        console.error('Error deactivating child:', error);
      }
    }
  };

  const handleEditSuccess = async () => {
    await fetchChildren(); // Wait for fetch to complete
    setIsEditModalOpen(false);
    setSelectedChild(null);
    
    // Show success message after list is refreshed
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'Child information has been updated.',
      timer: 1500
    });
  };

  // Add a function to handle printing ID card
  const handlePrintIDCard = () => {
    setShowSuccessModal(false);
    setShowPrintableID(true);
  };

  return (
    <div className="page-container">
      <Card
        variant="default"
        title="Children Management"
        titleColor="text-nextgen-blue-dark"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              endIcon={isSearching ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" />
                  <path className="opacity-75" fillRule="evenodd" d="M14.243 4.757a6 6 0 10-8.486 8.486A8.962 8.962 0 0112 3a8.962 8.962 0 018.486 6.243 6 6 0 01-8.486-8.486z" clipRule="evenodd" />
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
            Add Child
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <Table
            data={children}
            columns={columns}
            isLoading={loading}
            noDataMessage="No children found"
            highlightOnHover={true}
            variant="primary"
            stickyHeader={true}
            onRowClick={(row) => handleViewChild(row)}
          />
        </div>
        
        {totalPages > 1 && renderPagination()}
      </Card>
      
      {/* Add Child Modal */}
      {isAddModalOpen && (
        <AddChildForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddChildSuccess}
        />
      )}

      {/* Edit Child Modal */}
      {isEditModalOpen && selectedChild && (
        <AddChildForm
          isEdit={true}  // Make sure this is explicitly set
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          initialData={selectedChild}
        />
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedChild && (
        <ChildDetailView
          child={selectedChild}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedChild(null); // Add this line to clean up
          }}
        />
      )}

      {/* Registration Success Modal */}
      {showSuccessModal && registeredChildData && (
        <RegistrationSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          childData={registeredChildData}
          onPrintID={handlePrintIDCard}
        />
      )}

      {/* Printable ID Card Component */}
      {showPrintableID && registeredChildData && (
        <PrintableIDCard 
          childData={registeredChildData}
          onClose={() => setShowPrintableID(false)}
        />
      )}
    </div>
  );
};

export default ChildrenPage;