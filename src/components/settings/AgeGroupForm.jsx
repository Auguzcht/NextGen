import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import supabase from '../../services/supabase.js';
import { Input, Button } from '../ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const AgeGroupForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  const [formData, setFormData] = useState(() => {
    if (isEdit && initialData) {
      return {
        category_name: initialData.category_name || '',
        min_age: initialData.min_age || 0,
        max_age: initialData.max_age || 1,
        description: initialData.description || ''
      };
    }
    
    return {
      category_name: '',
      min_age: 0,
      max_age: 1,
      description: ''
    };
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    });
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.category_name.trim()) {
      newErrors.category_name = 'Category name is required';
    }
    
    if (formData.min_age === undefined || formData.min_age < 0) {
      newErrors.min_age = 'Minimum age must be 0 or greater';
    }
    
    if (formData.max_age === undefined || formData.max_age < 1) {
      newErrors.max_age = 'Maximum age must be 1 or greater';
    }
    
    if (formData.min_age > formData.max_age) {
      newErrors.min_age = 'Minimum age cannot be greater than maximum age';
      newErrors.max_age = 'Maximum age must be greater than minimum age';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    const hasData = formData.category_name.trim() !== '' || 
                   formData.description.trim() !== '';
    
    // Only prompt if there's data AND it's not editing an existing category
    if (hasData && !isEdit) {
      Swal.fire({
        title: 'Discard Changes?',
        text: 'Any unsaved changes will be lost.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, discard',
        cancelButtonText: 'No, keep editing'
      }).then((result) => {
        if (result.isConfirmed) {
          onClose();
        }
      });
      return; // Don't close yet - wait for user response
    }
    
    // Close directly if no data or editing existing
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please check all required fields'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (isEdit && initialData?.category_id) {
        // Update existing category
        const { error } = await supabase
          .from('age_categories')
          .update({
            category_name: formData.category_name.trim(),
            min_age: formData.min_age,
            max_age: formData.max_age,
            description: formData.description.trim() || null
          })
          .eq('category_id', initialData.category_id);
        
        if (error) throw error;
        
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Age category has been updated successfully.',
          timer: 1500
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('age_categories')
          .insert([{
            category_name: formData.category_name.trim(),
            min_age: formData.min_age,
            max_age: formData.max_age,
            description: formData.description.trim() || null
          }]);
        
        if (error) throw error;
        
        Swal.fire({
          icon: 'success',
          title: 'Added!',
          text: 'Age category has been added successfully.',
          timer: 1500
        });
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving age category:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save age category'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {isEdit ? 'Edit Age Category' : 'Add New Age Category'}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            type="button"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-6 rounded-r-md backdrop-blur-sm shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-nextgen-blue-dark font-medium">
                  {isEdit 
                    ? 'Update age category information for children classification'
                    : 'Create a new age category to organize children by age groups'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Name Section */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Category Information
              </h3>
              
              <Input
                label="Category Name *"
                name="category_name"
                value={formData.category_name}
                onChange={handleInputChange}
                error={errors.category_name}
                placeholder="e.g., Preschool, Elementary, Preteen"
                required
              />

              <div className="mt-4">
                <Input
                  type="textarea"
                  label="Description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this age group"
                />
              </div>
            </motion.div>

            {/* Age Range Section */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Age Range
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Minimum Age (Years) *"
                  name="min_age"
                  min="0"
                  max="18"
                  value={formData.min_age}
                  onChange={handleInputChange}
                  error={errors.min_age}
                  required
                />
                <Input
                  type="number"
                  label="Maximum Age (Years) *"
                  name="max_age"
                  min="1"
                  max="18"
                  value={formData.max_age}
                  onChange={handleInputChange}
                  error={errors.max_age}
                  required
                />
              </div>

              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Preview:</span> Children aged {formData.min_age} to {formData.max_age} years will be in this category
                </p>
              </div>
            </motion.div>

          </form>
        </div>

        {/* Form Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  {isEdit ? 'Saving Changes...' : 'Adding Category...'}
                </span>
              ) : (
                isEdit ? 'Save Changes' : 'Add Category'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AgeGroupForm;

