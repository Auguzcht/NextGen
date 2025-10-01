import { useState, useEffect, useCallback } from 'react';
import supabase from '../services/supabase.js';
import AddGuardianForm from '../components/guardians/AddGuardianForm.jsx';
import { Card, Button, Badge, Table, Input, Modal } from '../components/ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const GuardiansPage = () => {
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'view' or 'edit'

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
    fetchGuardians();
  }, [currentPage, debouncedSearchQuery]);

  // Modified to include photo_url in the query
  const fetchGuardians = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('guardians')
        .select(`
          *,
          child_guardian (
            child_id,
            is_primary,
            children (
              child_id,
              first_name,
              last_name,
              formal_id,
              birthdate,
              photo_url,
              age_category_id,
              age_categories (category_name)
            )
          )
        `)
        .order('last_name', { ascending: true });

      if (debouncedSearchQuery) {
        query = query.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,phone_number.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%`);
      }

      // Get total count for pagination
      let countQuery = supabase
        .from('guardians')
        .select('*', { count: 'exact', head: true });
        
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        countQuery = countQuery.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,phone_number.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%`);
      }
      
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      
      // Apply pagination
      query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      const { data, error } = await query;

      if (error) throw error;
      setGuardians(data || []);
    } catch (error) {
      console.error('Error fetching guardians:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddGuardianSuccess = () => {
    fetchGuardians();
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = async () => {
    await fetchGuardians(); // Wait for fetch to complete
    setViewMode(null);
    setSelectedGuardian(null);
    
    // Show success message after list is refreshed
    Swal.fire({
      icon: 'success',
      title: 'Updated!',
      text: 'Guardian information has been updated.',
      timer: 1500
    });
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

  const handleViewGuardian = (guardian) => {
    setSelectedGuardian(guardian);
    setViewMode('view');
  };

  const handleEditGuardian = (guardian) => {
    setSelectedGuardian(guardian);
    setViewMode('edit');
  };

  const handleDeactivateGuardian = async (guardian) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This will remove this guardian. This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // First check if this guardian is the only guardian for any child
        const { data: childGuardians, error: checkError } = await supabase
          .from('child_guardian')
          .select('child_id')
          .eq('guardian_id', guardian.guardian_id);
          
        if (checkError) throw checkError;
        
        // Create an array of child IDs associated with this guardian
        const childIds = childGuardians.map(cg => cg.child_id);
        
        // For each child, check if they have other guardians
        for (const childId of childIds) {
          const { count, error: countError } = await supabase
            .from('child_guardian')
            .select('*', { count: 'exact' })
            .eq('child_id', childId);
            
          if (countError) throw countError;
          
          if (count <= 1) {
            Swal.fire(
              'Cannot Remove',
              'This guardian is the only guardian for at least one child. Please add another guardian for the child first.',
              'error'
            );
            return;
          }
        }
        
        // If we get here, it's safe to delete the guardian
        const { error: deleteError } = await supabase
          .from('guardians')
          .delete()
          .eq('guardian_id', guardian.guardian_id);
          
        if (deleteError) throw deleteError;
        
        Swal.fire(
          'Removed!',
          'The guardian has been removed.',
          'success'
        );
        fetchGuardians();
      } catch (error) {
        Swal.fire(
          'Error!',
          'Failed to remove guardian: ' + error.message,
          'error'
        );
        console.error('Error removing guardian:', error);
      }
    }
  };

  const closeDetailView = () => {
    setSelectedGuardian(null);
    setViewMode(null);
  };

  // Define table columns for guardians
  const columns = [
    {
      header: "Name",
      accessor: (row) => `${row.first_name} ${row.last_name}`,
      cellClassName: "font-medium text-gray-900"
    },
    {
      header: "Contact",
      cell: (row) => (
        <div>
          {row.phone_number && (
            <div className="mb-1 text-gray-600">{row.phone_number}</div>
          )}
          {row.email && (
            <div className="text-nextgen-blue">{row.email}</div>
          )}
        </div>
      )
    },
    {
      header: "Relationship",
      accessor: "relationship",
      cell: (row) => row.relationship || 'Not specified'
    },
    {
      header: "Children",
      cell: (row) => {
        if (!row.child_guardian || row.child_guardian.length === 0) {
          return <span className="text-gray-400">No children</span>;
        }
        
        return (
          <div className="space-y-1">
            {row.child_guardian.map((cg) => (
              <div key={cg.child_id} className="flex items-center">
                <span>
                  {cg.children.first_name} {cg.children.last_name}
                  {/* Removed Primary Badge */}
                </span>
              </div>
            ))}
          </div>
        );
      }
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
              handleEditGuardian(row);
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
              handleDeactivateGuardian(row);
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          />
        </div>
      ),
      width: "100px"
    }
  ];

  // Render pagination controls
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

  return (
    <div className="page-container">
      <Card
        title="Guardian Management"
        titleColor="text-nextgen-blue-dark"
        variant="default"
        animate
        className="mb-6"
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
              placeholder="Search by name, phone, or email..."
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
            Add Guardian
          </Button>
        </div>

        <Table
          data={guardians}
          columns={columns}
          isLoading={loading}
          noDataMessage="No guardians found"
          onRowClick={handleViewGuardian}
          highlightOnHover={true}
          variant="primary"
          stickyHeader
        />
        
        {totalPages > 1 && renderPagination()}
      </Card>
      
      {/* Add Guardian Modal */}
      {isAddModalOpen && (
        <AddGuardianForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddGuardianSuccess}
        />
      )}

      {/* Guardian Detail View - Updated with photo support */}
      {selectedGuardian && viewMode === 'view' && (
        <Modal
          title="Guardian Details"
          isOpen={true}
          onClose={closeDetailView}
          size="2xl"
          variant="primary"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
            <Card
              title="Contact Information"
              variant="minimal"
              className="h-full"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-nextgen-blue-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              <div className="space-y-4 mt-2">
                <div className="bg-gray-50 p-4 rounded-lg flex items-start">
                  <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center text-nextgen-blue-dark font-medium text-sm mr-3">
                    {selectedGuardian.first_name?.charAt(0) || '?'}
                    {selectedGuardian.last_name?.charAt(0) || ''}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">{selectedGuardian.first_name} {selectedGuardian.last_name}</p>
                    <p className="text-sm text-nextgen-blue-dark font-medium">{selectedGuardian.relationship || 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-gray-800">{selectedGuardian.phone_number || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-800">{selectedGuardian.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title="Associated Children"
              variant="minimal"
              className="h-full"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-nextgen-blue-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            >
              {selectedGuardian.child_guardian?.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {selectedGuardian.child_guardian.map((cg) => (
                    <motion.div 
                      key={cg.child_id} 
                      className="py-3 px-2 rounded-md"
                      whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                    >
                      <div className="flex items-center">
                        {/* Show child photo if available, otherwise show initials */}
                        {cg.children?.photo_url ? (
                          <img
                            src={cg.children.photo_url}
                            alt={`${cg.children?.first_name} ${cg.children?.last_name}`}
                            className="h-10 w-10 rounded-full object-cover mr-3"
                            loading="lazy" 
                            onError={(e) => {
                              e.target.onerror = null; // Prevent infinite loop
                              e.target.src = `${import.meta.env.BASE_URL}placeholder-avatar.png`; // Fallback to default image
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center text-nextgen-blue-dark font-medium text-sm mr-3">
                            {cg.children?.first_name?.charAt(0) || '?'}
                            {cg.children?.last_name?.charAt(0) || ''}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="font-medium text-gray-900">
                              {cg.children.first_name} {cg.children.last_name}
                            </p>
                            {/* Removed Primary Badge */}
                          </div>
                          <p className="text-sm text-gray-500">
                            ID: {cg.children.formal_id || 'N/A'} • 
                            Age: {calculateAge(cg.children.birthdate)} yrs • 
                            Group: {cg.children.age_categories?.category_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-500 italic">No children associated with this guardian</p>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeDetailView}
              size="md"
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => handleEditGuardian(selectedGuardian)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              }
              size="md"
            >
              Edit Guardian
            </Button>
          </div>
        </Modal>
      )}

      {/* Guardian Edit Form */}
      {selectedGuardian && viewMode === 'edit' && (
        <AddGuardianForm
          isEdit={true}
          initialData={selectedGuardian}
          onClose={closeDetailView}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

// Add a cache for storing children's photos to reduce network requests
// Similar to the approach used in ChildrenPage
const useImageCache = () => {
  const [cache, setCache] = useState(new Map());
  
  const getImage = useCallback((url) => {
    if (cache.has(url)) {
      return cache.get(url);
    }
    return null;
  }, [cache]);
  
  const setImage = useCallback((url, image) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(url, image);
      return newCache;
    });
  }, []);
  
  return { getImage, setImage };
};

export default GuardiansPage;