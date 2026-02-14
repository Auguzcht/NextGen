import { useState, useEffect, useMemo } from 'react';
import supabase from '../../services/supabase.js';
import googleDrive from '../../services/googleDrive.js';
import MaterialForm from './MaterialForm.jsx';
import { Button, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input } from '../ui';
import { motion } from 'framer-motion';
import { formatDate } from '../../utils/dateUtils.js';

const MaterialsManager = ({ ageCategories = [] }) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchMaterials();
  }, []);
  
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

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          age_categories (category_name)
        `)
        .eq('is_active', true)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials', {
        description: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
  };

  const handleDelete = async (materialId) => {
    setMaterialToDelete(materialId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    const materialId = materialToDelete;
    setShowDeleteDialog(false);
    setDeletingId(materialId);

    try {
      // First, get the material to check if it has files to delete
      const { data: material, error: fetchError } = await supabase
        .from('materials')
        .select('file_url, link_type')
        .eq('material_id', materialId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete from Google Drive if it's an uploaded file (not external link)
      if (material.file_url && material.link_type === 'upload') {
        try {
          await googleDrive.deleteMaterialFiles(material.file_url);
        } catch (driveError) {
          console.error('Error deleting from Google Drive:', driveError);
          // Continue with database deletion even if Drive deletion fails
        }
      }
      
      // Hard delete from database
      const { error: deleteError } = await supabase
        .from('materials')
        .delete()
        .eq('material_id', materialId);
        
      if (deleteError) throw deleteError;
      
      toast.success('Material and all associated files have been permanently deleted', {
        description: 'Deleted!'
      });
      
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error(error.message || 'Failed to delete material', {
        description: 'Error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter materials based on search and filters
  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      // Search filter (use debounced search)
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = !debouncedSearchQuery || 
        material.title.toLowerCase().includes(searchLower) ||
        material.description?.toLowerCase().includes(searchLower) ||
        material.category.toLowerCase().includes(searchLower);
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
      
      // Age group filter
      const matchesAgeGroup = ageGroupFilter === 'all' || 
        material.age_category_id?.toString() === ageGroupFilter;
      
      return matchesSearch && matchesCategory && matchesAgeGroup;
    });
  }, [materials, debouncedSearchQuery, categoryFilter, ageGroupFilter]);
  
  // Paginated materials
  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMaterials.slice(startIndex, endIndex);
  }, [filteredMaterials, currentPage, itemsPerPage]);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, categoryFilter, ageGroupFilter]);
  
  // Get unique categories from materials
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(materials.map(m => m.category))];
    return uniqueCategories.sort();
  }, [materials]);
  
  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Render pagination UI
  const renderPagination = () => {
    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      range.push(1);

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (totalPages > 1) {
        range.push(totalPages);
      }

      const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

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
              {Math.min(currentPage * itemsPerPage, filteredMaterials.length)}
            </span>{' '}
            of <span className="font-medium">{filteredMaterials.length}</span> results
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

  const getCategoryIcon = (category) => {
    const icons = {
      'Lesson': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      'Activity': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'Song': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      'Craft': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      'Video': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      'Story': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      'Game': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      )
    };
    return icons[category] || icons['Lesson'];
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Materials Library</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload and manage educational materials for ministry use
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
            size="sm"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Material
          </Button>
        </div>
      </div>
      
      {/* Filters Section */}
      <motion.div 
        className="mb-6 border border-gray-200 bg-gray-50 rounded-lg px-4 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              type="text"
              label="Search Materials"
              placeholder="Search by title, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              endIcon={isSearching ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : null}
              size="sm"
              fullWidth
              style={{ height: '42px' }}
            />
          </div>
          
          <Input
            type="select"
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
            size="sm"
          />
          
          <Input
            type="select"
            label="Age Group"
            value={ageGroupFilter}
            onChange={(e) => setAgeGroupFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Age Groups' },
              ...ageCategories
                .filter(cat => cat.age_category_id)
                .map(cat => ({ 
                  value: cat.age_category_id.toString(), 
                  label: cat.category_name 
                }))
            ]}
            size="sm"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setAgeGroupFilter('all');
              }}
              disabled={!searchQuery && categoryFilter === 'all' && ageGroupFilter === 'all'}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              style={{ height: '42px', paddingLeft: '12px', paddingRight: '12px' }}
            >
              Clear
            </Button>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {filteredMaterials.length} material{filteredMaterials.length !== 1 ? 's' : ''} found
            {totalPages > 1 && (
              <span> • Page {currentPage} of {totalPages}</span>
            )}
          </p>
        </div>
      </motion.div>
      
      {/* Materials Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age Group
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Upload Date
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
                    <span className="ml-3 text-sm text-gray-500">Loading materials...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedMaterials.length === 0 && filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">No materials match your filters</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                </td>
              </tr>
            ) : paginatedMaterials.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">No materials found</p>
                  <p className="text-xs text-gray-400 mt-1">Add educational materials to get started</p>
                </td>
              </tr>
            ) : (
              paginatedMaterials.map((material) => (
                <motion.tr 
                  key={material.material_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                  className="group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-nextgen-blue to-nextgen-teal flex items-center justify-center text-white mr-3">
                        {getCategoryIcon(material.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{material.title}</div>
                        {material.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">{material.description}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          {material.link_type === 'external' ? (
                            <Badge variant="info" size="sm">
                              External URL
                            </Badge>
                          ) : material.file_url && material.file_url.includes('drive.google.com') ? (
                            <Badge variant="success" size="sm">
                              Google Drive
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="primary" size="sm">
                      {material.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="info" size="sm">
                      {material.age_categories?.category_name || 'All Ages'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {material.upload_date ? formatDate(material.upload_date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-2">
                      {material.file_url && (
                        <a
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nextgen-blue hover:text-nextgen-blue-dark"
                        >
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={
                              material.link_type === 'external' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              ) : material.file_url.includes('drive.google.com') ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )
                            }
                          >
                            {material.link_type === 'external' ? 'Open Link' : material.file_url.includes('drive.google.com') ? 'View' : 'Open'}
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleEdit(material)}
                        className="text-nextgen-blue"
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleDelete(material.material_id)}
                        disabled={deletingId === material.material_id}
                        isLoading={deletingId === material.material_id}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && renderPagination()}

      {/* Add/Edit Form Modal */}
      {(showForm || editingMaterial) && (
        <MaterialForm
          isEdit={!!editingMaterial}
          initialData={editingMaterial}
          ageCategories={ageCategories}
          onClose={() => {
            setShowForm(false);
            setEditingMaterial(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingMaterial(null);
            fetchMaterials();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material?</DialogTitle>
            <DialogDescription>
              This will permanently delete the material and all associated files from Google Drive.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Yes, delete it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsManager;
