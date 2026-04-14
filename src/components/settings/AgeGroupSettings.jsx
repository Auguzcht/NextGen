import { useState, useMemo } from 'react';
import supabase from '../../services/supabase.js';
import AgeGroupForm from './AgeGroupForm.jsx';
import { Button, Badge, Table, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
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

  // Define table columns
  const columns = useMemo(() => [
    {
      header: "Category",
      accessor: "category_name",
      cellClassName: "font-medium text-gray-900"
    },
    {
      header: "Age Range",
      accessor: "min_age",
      cell: (row) => (
        <Badge variant="info" size="sm">
          {row.min_age} - {row.max_age} years
        </Badge>
      )
    },
    {
      header: "Description",
      accessor: "description",
      noWrap: false,
      maxWidth: "300px",
      cell: (row) => (
        <div className="text-sm text-gray-500 break-words">
          {row.description || <span className="text-gray-400 italic">No description</span>}
        </div>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      maxWidth: "180px",
      cell: (row) => (
        <div className="flex justify-end items-center space-x-1 sm:space-x-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleEdit(row)}
            className="text-nextgen-blue"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="danger"
            size="xs"
            onClick={() => handleDeleteCategory(row.category_id)}
            disabled={deletingId === row.category_id}
            isLoading={deletingId === row.category_id}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      )
    }
  ], [deletingId]);

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="mb-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Age Categories</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage age groups for organizing children
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Age Category
          </Button>
        </div>
      </div>

      {/* Age Categories Table */}
      <Table
        data={ageCategories}
        columns={columns}
        isLoading={loading}
        noDataMessage="No age categories found. Create age categories to organize children."
        highlightOnHover={true}
        variant="default"
        size="md"
        mobileCollapsible={true}
      />

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