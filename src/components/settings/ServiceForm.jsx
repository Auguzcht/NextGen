import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Input, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

const ServiceForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  const { toast } = useToast();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    service_name: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        service_name: initialData.service_name || '',
        day_of_week: initialData.day_of_week || '',
        start_time: initialData.start_time || '',
        end_time: initialData.end_time || '',
        location: initialData.location || '',
        description: initialData.description || ''
      });
    }
  }, [isEdit, initialData]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.service_name.trim()) {
      newErrors.service_name = 'Service name is required';
    }
    
    if (!formData.day_of_week) {
      newErrors.day_of_week = 'Day of week is required';
    }
    
    if (formData.start_time && formData.end_time) {
      if (formData.start_time >= formData.end_time) {
        newErrors.end_time = 'End time must be after start time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    if (!isEdit) {
      const hasData = formData.service_name.trim() !== '' || 
                     formData.day_of_week !== '' ||
                     formData.location.trim() !== '';
      
      if (hasData) {
        setShowDiscardDialog(true);
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please check all required fields', {
        description: 'Validation Error'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (isEdit && initialData?.service_id) {
        const { error } = await supabase
          .from('services')
          .update({
            service_name: formData.service_name.trim(),
            day_of_week: formData.day_of_week,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            location: formData.location.trim() || null,
            description: formData.description.trim() || null
          })
          .eq('service_id', initialData.service_id);
        
        if (error) throw error;
        
        toast.success('Service has been updated successfully', {
          description: 'Updated!'
        });
      } else {
        const { error } = await supabase
          .from('services')
          .insert([{
            service_name: formData.service_name.trim(),
            day_of_week: formData.day_of_week,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            location: formData.location.trim() || null,
            description: formData.description.trim() || null
          }]);
        
        if (error) throw error;
        
        toast.success('Service has been added successfully', {
          description: 'Added!'
        });
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error(error.message || 'Failed to save service', {
        description: 'Error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const dayOptions = [
    { value: '', label: 'Select a day' },
    { value: 'Sunday', label: 'Sunday' },
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' }
  ];

  // Render modal using portal to ensure it's at the root level
  const modalContent = (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {isEdit ? 'Edit Service' : 'Add New Service'}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-6 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-nextgen-blue-dark font-medium">
                  {isEdit 
                    ? 'Update service schedule and information'
                    : 'Add a new service with schedule details'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Service Name *"
                  name="service_name"
                  value={formData.service_name}
                  onChange={handleInputChange}
                  error={errors.service_name}
                  placeholder="e.g., First Service, Sunday School"
                  required
                />

                <Input
                  type="select"
                  label="Day of Week *"
                  name="day_of_week"
                  value={formData.day_of_week}
                  onChange={handleInputChange}
                  options={dayOptions}
                  error={errors.day_of_week}
                  required
                />

                <Input
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Sanctuary, Room 101"
                />
              </div>
            </motion.div>

            {/* Schedule */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Schedule
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="time"
                  label="Start Time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                />
                
                <Input
                  type="time"
                  label="End Time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                  error={errors.end_time}
                />
              </div>
            </motion.div>

            {/* Description */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Additional Details
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the service"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
                />
              </div>
            </motion.div>
          </form>
        </div>

        {/* Form Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 sticky bottom-0">
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
                  {isEdit ? 'Updating...' : 'Adding...'}
                </span>
              ) : (
                isEdit ? 'Save Changes' : 'Add Service'
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Discard Changes Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
            <DialogDescription>
              Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDiscardDialog(false)}>
              No, keep editing
            </Button>
            <Button variant="danger" onClick={confirmDiscard}>
              Yes, discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Use createPortal to render at document.body level
  return createPortal(modalContent, document.body);
};

export default ServiceForm;