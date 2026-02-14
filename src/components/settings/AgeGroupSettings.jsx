import { useState } from 'react';
import supabase from '../../services/supabase.js';
import AgeGroupForm from './AgeGroupForm.jsx';
import { Button, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion } from 'framer-motion';

const AgeGroupSettings = ({ ageCategories, onUpdate, loading }) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleEdit = (category) => {
    setEditingCategory(category);
  };

  const handleDeleteCategory = async (categoryId) => {
    setCategoryToDelete(categoryId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    const categoryId = categoryToDelete;
    setShowDeleteDialog(false);
    setDeletingId(categoryId);

    try {
      const { error } = await supabase
        .from('age_categories')
        .delete()
        .eq('category_id', categoryId);
        
      if (error) throw error;
      
      toast.success('Age category has been deleted', {
        description: 'Deleted!'
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting age category:', error);
      toast.error(error.message || 'Failed to delete age category', {
        description: 'Error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Age Categories</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure age groups for children classification
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
          Add Age Category
        </Button>
      </div>
      
      {/* Custom Table - Matching StaffList Design */}
      <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age Range
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
                    <span className="ml-3 text-sm text-gray-500">Loading age categories...</span>
                  </div>
                </td>
              </tr>
            ) : ageCategories.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">No age categories found</p>
                  <p className="text-xs text-gray-400 mt-1">Create age categories to organize children</p>
                </td>
              </tr>
            ) : (
              ageCategories.map((category) => (
                <motion.tr 
                  key={category.category_id}
                  whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                  className="group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{category.category_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="info" size="sm">
                      {category.min_age} - {category.max_age} years
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate">
                      {category.description || <span className="text-gray-400 italic">No description</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleEdit(category)}
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
                        onClick={() => handleDeleteCategory(category.category_id)}
                        disabled={deletingId === category.category_id}
                        isLoading={deletingId === category.category_id}
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

      {/* Add/Edit Form Modal */}
      {(showForm || editingCategory) && (
        <AgeGroupForm
          isEdit={!!editingCategory}
          initialData={editingCategory}
          onClose={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCategory(null);
            onUpdate();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Age Category?</DialogTitle>
            <DialogDescription>
              This may affect children records. Are you sure you want to delete this category?
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

export default AgeGroupSettings;