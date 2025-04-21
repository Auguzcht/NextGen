import { useState, useEffect } from 'react';
import supabase from '../services/supabase.js';
import AddGuardianForm from '../components/guardians/AddGuardianForm.jsx';

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

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Guardian Management</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add Guardian
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
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
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Relationship
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Children
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guardians.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      No guardians found
                    </td>
                  </tr>
                ) : (
                  guardians.map((guardian) => (
                    <tr key={guardian.guardian_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {guardian.first_name} {guardian.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guardian.phone_number && (
                          <div className="mb-1">{guardian.phone_number}</div>
                        )}
                        {guardian.email && (
                          <div className="text-indigo-600">{guardian.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guardian.relationship || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {guardian.child_guardian?.length > 0 ? (
                          <div className="space-y-1">
                            {guardian.child_guardian.map((cg) => (
                              <div key={cg.child_id} className="flex items-center">
                                <span>
                                  {cg.children.first_name} {cg.children.last_name}
                                  {cg.is_primary && (
                                    <span className="ml-2 text-xs font-semibold text-indigo-600">
                                      (Primary)
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          'No children'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewGuardian(guardian)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditGuardian(guardian)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, (totalPages * itemsPerPage))}
                    </span>{' '}
                    of <span className="font-medium">{totalPages * itemsPerPage}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                        currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === i + 1
                            ? 'bg-indigo-50 text-indigo-600 z-10'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 ${
                        currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Add Guardian Modal */}
      {isAddModalOpen && (
        <AddGuardianForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddGuardianSuccess}
        />
      )}

      {/* Guardian Detail View */}
      {selectedGuardian && viewMode === 'view' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Guardian Details</h2>
              <button 
                onClick={closeDetailView}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Name</p>
                      <p className="mt-1">{selectedGuardian.first_name} {selectedGuardian.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="mt-1">{selectedGuardian.phone_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="mt-1">{selectedGuardian.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Relationship</p>
                      <p className="mt-1">{selectedGuardian.relationship || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Associated Children</h3>
                  {selectedGuardian.child_guardian?.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {selectedGuardian.child_guardian.map((cg) => (
                        <li key={cg.child_id} className="py-3">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">
                                {cg.children.first_name} {cg.children.last_name}
                                {cg.is_primary && (
                                  <span className="ml-2 text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                    Primary
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                ID: {cg.children.formal_id || 'N/A'} • 
                                Age: {calculateAge(cg.children.birthdate)} • 
                                Group: {cg.children.age_categories?.category_name || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">No children associated with this guardian</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => handleEditGuardian(selectedGuardian)}
                  className="ml-3 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit Guardian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guardian Edit Form - This will be completed in the future */}
      {selectedGuardian && viewMode === 'edit' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Edit Guardian</h2>
              <button 
                onClick={closeDetailView}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Edit form will be implemented later */}
              <p className="text-gray-500 text-center py-4">Edit functionality will be implemented in future updates.</p>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeDetailView}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardiansPage;