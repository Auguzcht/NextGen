import { useState, useEffect } from 'react';
import supabase from '../services/supabase.js';
import AddChildForm from '../components/children/AddChildForm.jsx';
import { Card, Button, Badge, Table, Input } from '../components/ui';
import { motion } from 'framer-motion';

const ChildrenPage = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchChildren();
  }, [currentPage, searchQuery]);

  const fetchChildren = async () => {
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
        .order('registration_date', { ascending: false });

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,formal_id.ilike.%${searchQuery}%`);
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true });

      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      
      // Apply pagination
      query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      const { data, error } = await query;

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAddChildSuccess = () => {
    fetchChildren();
    setIsAddModalOpen(false);
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

  const getPrimaryGuardian = (childGuardians) => {
    if (!childGuardians || childGuardians.length === 0) return null;
    
    const primaryGuardian = childGuardians.find(cg => cg.is_primary) || childGuardians[0];
    return primaryGuardian.guardians;
  };
  
  // Table columns configuration
  const columns = [
    {
      header: "ID",
      accessor: "formal_id",
      cellClassName: "font-medium text-gray-900",
      cell: (row) => row.formal_id || 'N/A'
    },
    {
      header: "Name",
      accessor: (row) => `${row.first_name} ${row.last_name}`
    },
    {
      header: "Age",
      accessor: (row) => calculateAge(row.birthdate)
    },
    {
      header: "Age Group",
      accessor: "age_categories.category_name",
      cell: (row) => row.age_categories?.category_name || 'Unknown'
    },
    {
      header: "Primary Guardian",
      accessor: (row) => {
        const primaryGuardian = getPrimaryGuardian(row.child_guardian);
        return primaryGuardian ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}` : 'None';
      }
    },
    {
      header: "Contact",
      accessor: (row) => {
        const primaryGuardian = getPrimaryGuardian(row.child_guardian);
        return primaryGuardian?.phone_number || primaryGuardian?.email || 'N/A';
      }
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
      )
    },
    {
      header: "Actions",
      cellClassName: "text-right",
      cell: (row) => (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => console.log('Edit child:', row.child_id)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => console.log('View child:', row.child_id)}
          >
            View
          </Button>
        </div>
      )
    }
  ];

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

        <Table
          data={children}
          columns={columns}
          isLoading={loading}
          noDataMessage="No children found"
          highlightOnHover={true}
          variant="primary"
          stickyHeader={true}
          onRowClick={(row) => console.log('Row clicked:', row.child_id)}
        />
        
        {totalPages > 1 && renderPagination()}
      </Card>
      
      {/* Add Child Modal */}
      {isAddModalOpen && (
        <AddChildForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddChildSuccess}
        />
      )}
    </div>
  );
};

export default ChildrenPage;