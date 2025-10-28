import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Input } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const StaffAssignmentForm = ({ isOpen, onClose, onSuccess, isEdit = false, initialData = null }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [errors, setErrors] = useState({});
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  
  // Initialize form data with either initialData, cached data, or defaults
  const [formData, setFormData] = useState(() => {
    // If editing, use initialData
    if (isEdit && initialData) {
      return {
        staff_id: initialData.staff_id || '',
        service_id: initialData.service_id || '',
        assignment_date: initialData.assignment_date || new Date().toISOString().split('T')[0],
        role: initialData.role || 'helper',
        notes: initialData.notes || ''
      };
    }
    
    // If not editing, check for cached draft
    const cachedDraft = localStorage.getItem('nextgen_staff_assignment_form_draft');
    if (cachedDraft && !isEdit) {
      try {
        const parsedDraft = JSON.parse(cachedDraft);
        
        // Only set the draft flag to true if there's actual content
        const hasContent = Object.values(parsedDraft).some(val => 
          typeof val === 'string' ? val.trim() !== '' : val !== null && val !== undefined
        );
        
        if (hasContent) {
          setIsRestoredDraft(true);
          return parsedDraft;
        }
      } catch (e) {
        console.error('Error parsing cached form data:', e);
      }
    }
    
    // Default empty form
    return {
      staff_id: '',
      service_id: '',
      assignment_date: new Date().toISOString().split('T')[0],
      role: 'helper',
      notes: ''
    };
  });

  // Save form data to localStorage when it changes (only for new entries)
  useEffect(() => {
    if (!isEdit && isOpen) {
      if (!isRestoredDraft || formHasData()) {
        localStorage.setItem('nextgen_staff_assignment_form_draft', JSON.stringify(formData));
      }
    }
  }, [formData, isEdit, isOpen, isRestoredDraft]);

  useEffect(() => {
    if (isOpen) {
      fetchStaffAndServices();
    }
  }, [isOpen]);

  const fetchStaffAndServices = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Fetch active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('staff_id, first_name, last_name, role')
        .eq('is_active', true)
        .order('last_name');

      if (staffError) throw staffError;

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('service_id, service_name, day_of_week, start_time')
        .order('day_of_week', { ascending: true });

      if (servicesError) throw servicesError;

      setStaff(staffData || []);
      setServices(servicesData || []);

      // Set default values if data exists and form is empty
      if (!isEdit && !formData.staff_id && staffData?.length > 0) {
        setFormData(prev => ({ ...prev, staff_id: staffData[0].staff_id }));
      }
      if (!isEdit && !formData.service_id && servicesData?.length > 0) {
        setFormData(prev => ({ ...prev, service_id: servicesData[0].service_id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load staff and services data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
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
    
    if (!formData.staff_id) newErrors.staff_id = 'Please select a staff member';
    if (!formData.service_id) newErrors.service_id = 'Please select a service';
    if (!formData.assignment_date) newErrors.assignment_date = 'Date is required';
    if (!formData.role) newErrors.role = 'Please select a role';
    
    // Validate date is not in the past (only for new assignments)
    if (!isEdit) {
      const selectedDate = new Date(formData.assignment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.assignment_date = 'Cannot assign to a past date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper to check if the form has any data
  const formHasData = () => {
    return (
      formData.staff_id !== '' ||
      formData.service_id !== '' ||
      formData.role !== 'helper' ||
      formData.notes.trim() !== ''
    );
  };

  // Helper to clear form cache
  const clearFormCache = () => {
    localStorage.removeItem('nextgen_staff_assignment_form_draft');
  };

  const handleClose = () => {
    if (!isEdit && formHasData()) {
      Swal.fire({
        title: 'Save Draft?',
        text: 'Do you want to save your progress as a draft for later?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Save Draft',
        cancelButtonText: 'Discard'
      }).then((result) => {
        if (!result.isConfirmed) {
          clearFormCache();
        }
        onClose();
      });
    } else {
      onClose();
    }
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
    
    setSubmitting(true);

    try {
      if (isEdit && initialData?.assignment_id) {
        // Update existing assignment
        const { error } = await supabase
          .from('staff_assignments')
          .update({
            staff_id: formData.staff_id,
            service_id: formData.service_id,
            assignment_date: formData.assignment_date,
            role: formData.role,
            notes: formData.notes?.trim() || null
          })
          .eq('assignment_id', initialData.assignment_id);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Assignment has been updated successfully.',
          timer: 1500
        });
      } else {
        // Check if assignment already exists (only for new assignments)
        const { data: existingAssignments, error: checkError } = await supabase
          .from('staff_assignments')
          .select('assignment_id')
          .eq('staff_id', formData.staff_id)
          .eq('service_id', formData.service_id)
          .eq('assignment_date', formData.assignment_date);

        if (checkError) throw checkError;

        if (existingAssignments?.length > 0) {
          throw new Error('This staff member is already assigned to this service on this date');
        }

        // Create new assignment
        const { error } = await supabase
          .from('staff_assignments')
          .insert([{
            staff_id: formData.staff_id,
            service_id: formData.service_id,
            assignment_date: formData.assignment_date,
            role: formData.role,
            notes: formData.notes?.trim() || null
          }]);

        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Staff member has been assigned successfully.',
          timer: 1500
        });

        // Clear form cache on successful submission
        clearFormCache();
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving assignment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save assignment'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Role options with descriptions
  const roleOptions = [
    { value: 'helper', label: 'Helper', description: 'Assists with activities and supervision' },
    { value: 'teacher', label: 'Teacher', description: 'Leads lessons and activities' },
    { value: 'leader', label: 'Leader', description: 'Oversees the entire service' },
    { value: 'check-in', label: 'Check-in', description: 'Manages attendance and registration' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {isEdit ? 'Edit Staff Assignment' : 'Assign Staff Member'}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            disabled={submitting}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Show saved draft indicator */}
        {!isEdit && isRestoredDraft && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-6 mt-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Restored from saved draft. Continue where you left off.
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => {
                      clearFormCache();
                      setIsRestoredDraft(false);
                    }}
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    ? 'Update staff assignment details'
                    : 'Assign a staff member to a service on a specific date'
                  }
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Staff and Service Selection */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Assignment Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Staff Member *
                    </label>
                    <select
                      id="staff_id"
                      name="staff_id"
                      value={formData.staff_id}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full py-2 px-3 border ${errors.staff_id ? 'border-red-300' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm`}
                      required
                    >
                      <option value="">Select a staff member</option>
                      {staff.map((staffMember) => (
                        <option key={staffMember.staff_id} value={staffMember.staff_id}>
                          {staffMember.first_name} {staffMember.last_name} ({staffMember.role})
                        </option>
                      ))}
                    </select>
                    {errors.staff_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.staff_id}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="service_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Service *
                    </label>
                    <select
                      id="service_id"
                      name="service_id"
                      value={formData.service_id}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full py-2 px-3 border ${errors.service_id ? 'border-red-300' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm`}
                      required
                    >
                      <option value="">Select a service</option>
                      {services.map((service) => (
                        <option key={service.service_id} value={service.service_id}>
                          {service.service_name} - {service.day_of_week} {service.start_time ? `at ${service.start_time.slice(0, 5)}` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.service_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_id}</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Date and Role */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Schedule & Role
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="assignment_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Assignment Date *
                    </label>
                    <Input
                      type="date"
                      id="assignment_date"
                      name="assignment_date"
                      value={formData.assignment_date}
                      onChange={handleInputChange}
                      error={errors.assignment_date}
                      required
                      fullWidth
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full py-2 px-3 border ${errors.role ? 'border-red-300' : 'border-gray-300'} bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm`}
                      required
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {roleOptions.find(r => r.value === formData.role)?.description}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Notes */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Additional Notes
                </h3>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows="3"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-nextgen-blue focus:border-nextgen-blue mt-1 block w-full sm:text-sm border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Any special instructions or notes for this assignment..."
                  ></textarea>
                </div>
              </motion.div>
            </form>
          )}
        </div>

        {/* Form Actions - Bottom fixed section */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting || loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || loading}
              className="relative"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  {isEdit ? 'Updating...' : 'Assigning...'}
                </span>
              ) : (
                isEdit ? 'Update Assignment' : 'Assign Staff'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffAssignmentForm;