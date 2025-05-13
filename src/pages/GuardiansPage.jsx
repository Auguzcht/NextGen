import { useState, useEffect } from 'react';
import supabase from '../services/supabase.js';
import AddGuardianForm from '../components/guardians/AddGuardianForm.jsx';
import { Card, Button, Badge, Table, Input, Modal } from '../components/ui';
import { motion } from 'framer-motion';

const GuardiansPage = () => {
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'view' or 'edit'

  useEffect(() => {
    fetchGuardians();
  }, [currentPage, searchQuery]);

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
              age_category_id,
              age_categories (category_name)
            )
          )
        `)
        .order('last_name', { ascending: true });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('guardians')
        .select('*', { count: 'exact', head: true });

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
                  {cg.is_primary && (
                    <Badge
                      variant="primary"
                      size="xs"
                      className="ml-2"
                    >
                      Primary
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleViewGuardian(row);
            }}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleEditGuardian(row);
            }}
          >
            Edit
          </Button>
        </div>
      ),
      width: "120px"
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
            className="md:w-1/2"
          />
          
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

      {/* Guardian Detail View */}
      {selectedGuardian && viewMode === 'view' && (
        <Modal
          title="Guardian Details"
          isOpen={true}
          onClose={closeDetailView}
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Contact Information"
              variant="minimal"
              className="h-full"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="mt-1 text-gray-900 font-medium">{selectedGuardian.first_name} {selectedGuardian.last_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1 text-gray-800">{selectedGuardian.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-gray-800">{selectedGuardian.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Relationship</p>
                  <p className="mt-1 text-gray-800">{selectedGuardian.relationship || 'Not specified'}</p>
                </div>
              </div>
            </Card>

            <Card
              title="Associated Children"
              variant="minimal"
              className="h-full"
            >
              {selectedGuardian.child_guardian?.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {selectedGuardian.child_guardian.map((cg) => (
                    <motion.div 
                      key={cg.child_id} 
                      className="py-3"
                      whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {cg.children.first_name} {cg.children.last_name}
                            {cg.is_primary && (
                              <Badge variant="primary" size="sm" className="ml-2">
                                Primary
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            ID: {cg.children.formal_id || 'N/A'} • 
                            Age: {calculateAge(cg.children.birthdate)} • 
                            Group: {cg.children.age_categories?.category_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic py-4">No children associated with this guardian</p>
              )}
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="primary"
              onClick={() => handleEditGuardian(selectedGuardian)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              }
            >
              Edit Guardian
            </Button>
          </div>
        </Modal>
      )}

      {/* Guardian Edit Form */}
      {selectedGuardian && viewMode === 'edit' && (
        <Modal
          title="Edit Guardian"
          isOpen={true}
          onClose={closeDetailView}
          size="lg"
        >
          <div className="py-6">
            <p className="text-gray-500 text-center">Edit functionality will be implemented in future updates.</p>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              onClick={closeDetailView}
            >
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GuardiansPage;