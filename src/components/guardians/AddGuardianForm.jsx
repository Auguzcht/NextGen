import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Card, Button, Input, Badge, Alert } from '../ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const AddGuardianForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [childrenSearchQuery, setChildrenSearchQuery] = useState('');
  // Add a state to track if this is a restored draft
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  
  // Initialize form data with either initialData, cached data, or defaults
  const [formData, setFormData] = useState(() => {
    // If editing, use initialData
    if (isEdit && initialData) {
      return {
        firstName: initialData.first_name || '',
        lastName: initialData.last_name || '',
        phone: initialData.phone_number || '',
        email: initialData.email || '',
        relationship: initialData.relationship || 'Parent',
        associatedChildren: []
      };
    }
    
    // If not editing, check for cached draft
    const cachedDraft = localStorage.getItem('nextgen_guardian_form_draft');
    if (cachedDraft && !isEdit) {
      try {
        const parsedDraft = JSON.parse(cachedDraft);
        
        // Only set the draft flag to true if there's actual content in the draft
        // and it's not an empty form
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
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      relationship: 'Parent',
      associatedChildren: []
    };
  });
  
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  
  // Save form data to localStorage when it changes (only for new entries)
  useEffect(() => {
    if (!isEdit) {
      // Don't update localStorage if this is the first time the form is being filled
      // (only update it for actual changes after initial render)
      if (!isRestoredDraft || formHasData()) {
        localStorage.setItem('nextgen_guardian_form_draft', JSON.stringify(formData));
      }
    }
  }, [formData, isEdit, isRestoredDraft]);

  useEffect(() => {
    fetchAvailableChildren();
    
    // If editing, also fetch associated children
    if (isEdit && initialData) {
      fetchAssociatedChildren(initialData.guardian_id);
    }
  }, [isEdit, initialData]);

  const fetchAvailableChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select(`
          child_id,
          formal_id,
          first_name,
          last_name,
          birthdate,
          age_category_id,
          age_categories (category_name)
        `)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch children data'
      });
    }
  };

  const fetchAssociatedChildren = async (guardianId) => {
    try {
      const { data, error } = await supabase
        .from('child_guardian')
        .select('child_id, is_primary')
        .eq('guardian_id', guardianId);
        
      if (error) throw error;
      
      // Map to the format used by the form
      const associatedChildren = data.map(item => ({
        childId: item.child_id,
        isPrimary: item.is_primary
      }));
      
      setFormData(prev => ({
        ...prev,
        associatedChildren
      }));
    } catch (error) {
      console.error('Error fetching associated children:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Format Philippine phone number
      const cleaned = value.replace(/\D/g, '');
      const formattedPhone = cleaned.length > 0 
        ? (cleaned.startsWith('09') || cleaned.startsWith('9') 
            ? (cleaned.startsWith('0') ? cleaned : '0' + cleaned).slice(0, 11) 
            : '09')
        : '';

      setFormData({
        ...formData,
        phone: formattedPhone
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleChildSelection = (e) => {
    const { value, checked } = e.target;
    const childId = Number(value);
    
    if (checked) {
      // Add child to associated children - still set isPrimary flag for database
      // but we don't display it in the UI anymore
      setFormData(prev => {
        const newAssociatedChildren = [
          ...prev.associatedChildren, 
          { 
            childId, 
            isPrimary: prev.associatedChildren.length === 0 // First child is primary by default
          }
        ];
        return { ...prev, associatedChildren: newAssociatedChildren };
      });
    } else {
      // Remove child from associated children
      setFormData(prev => {
        const updatedChildren = prev.associatedChildren.filter(
          child => child.childId !== childId
        );
        
        // Ensure at least one child is primary if we still have children
        if (updatedChildren.length > 0 && !updatedChildren.some(child => child.isPrimary)) {
          updatedChildren[0].isPrimary = true;
        }
        
        return { ...prev, associatedChildren: updatedChildren };
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // At least one contact method
    if (!formData.phone && !formData.email) {
      newErrors.phone = 'At least one contact method is required';
      newErrors.email = 'At least one contact method is required';
    }
    
    // Philippine phone number validation (09XXXXXXXXX format)
    if (formData.phone) {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Phone number must start with 09 and have 11 digits';
      }
    }
    
    // Email format
    if (formData.email) {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper to check if the form has any data
  const formHasData = () => {
    return (
      formData.firstName.trim() !== '' ||
      formData.lastName.trim() !== '' ||
      formData.phone.trim() !== '' ||
      formData.email.trim() !== '' ||
      formData.relationship !== 'Parent' ||
      formData.associatedChildren.length > 0
    );
  };

  // Helper to check if the form is completely empty
  const isFormEmpty = () => {
    return (
      formData.firstName.trim() === '' &&
      formData.lastName.trim() === '' &&
      formData.phone.trim() === '' &&
      formData.email.trim() === '' &&
      formData.relationship === 'Parent' &&
      formData.associatedChildren.length === 0
    );
  };

  // Helper to clear form cache
  const clearFormCache = () => {
    localStorage.removeItem('nextgen_guardian_form_draft');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please check all required fields'
      });
      return;
    }
    
    setLoading(true);
    try {
      if (isEdit) {
        // Update existing guardian
        const { error: updateError } = await supabase
          .from('guardians')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phone || null,
            email: formData.email || null,
            relationship: formData.relationship
          })
          .eq('guardian_id', initialData.guardian_id);

        if (updateError) throw updateError;
        
        // Handle associated children - first get existing associations
        const { data: existingAssociations, error: fetchError } = await supabase
          .from('child_guardian')
          .select('child_id')
          .eq('guardian_id', initialData.guardian_id);
          
        if (fetchError) throw fetchError;
        
        // Determine which to add and which to remove
        const existingChildIds = existingAssociations.map(item => item.child_id);
        const newChildIds = formData.associatedChildren.map(child => child.childId);
        
        // Children to remove
        const childrenToRemove = existingChildIds.filter(id => !newChildIds.includes(id));
        
        // Children to add
        const childrenToAdd = formData.associatedChildren.filter(
          child => !existingChildIds.includes(child.childId)
        );
        
        // Children to update primary status
        const childrenToUpdate = formData.associatedChildren.filter(
          child => existingChildIds.includes(child.childId)
        );
        
        // Remove associations
        if (childrenToRemove.length > 0) {
          for (const childId of childrenToRemove) {
            const { error: removeError } = await supabase
              .from('child_guardian')
              .delete()
              .eq('guardian_id', initialData.guardian_id)
              .eq('child_id', childId);
              
            if (removeError) throw removeError;
          }
        }
        
        // Add new associations
        if (childrenToAdd.length > 0) {
          const { error: addError } = await supabase
            .from('child_guardian')
            .insert(childrenToAdd.map(child => ({
              child_id: child.childId,
              guardian_id: initialData.guardian_id,
              is_primary: child.isPrimary
            })));
            
          if (addError) throw addError;
        }
        
        // Update primary status
        for (const child of childrenToUpdate) {
          const { error: updateChildError } = await supabase
            .from('child_guardian')
            .update({ is_primary: child.isPrimary })
            .eq('guardian_id', initialData.guardian_id)
            .eq('child_id', child.childId);
            
          if (updateChildError) throw updateChildError;
        }
      } else {
        // Insert new guardian
        const { data: guardianData, error: guardianError } = await supabase
          .from('guardians')
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phone || null,
            email: formData.email || null,
            relationship: formData.relationship
          })
          .select('guardian_id');

        if (guardianError) throw guardianError;
        
        // Insert child-guardian relationships if there are associated children
        if (formData.associatedChildren.length > 0) {
          const childGuardianData = formData.associatedChildren.map(child => ({
            child_id: child.childId,
            guardian_id: guardianData[0].guardian_id,
            is_primary: child.isPrimary
          }));
          
          const { error: relationshipError } = await supabase
            .from('child_guardian')
            .insert(childGuardianData);
            
          if (relationshipError) throw relationshipError;
        }
      }
      
      // Clear form cache on successful submission
      if (!isEdit) {
        clearFormCache();
      }
      
      // Only show success message for new guardians, not edits
      // (for edits, the parent component will handle the success message)
      if (!isEdit) {
        Swal.fire({
          icon: 'success',
          title: 'Guardian Added',
          text: 'New guardian has been added successfully.',
          timer: 1500
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error with guardian:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to ${isEdit ? 'update' : 'add'} guardian: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
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

  const handleClose = () => {
    // If not editing, ask user if they want to save their draft
    if (!isEdit) {
      if (formHasData() && !isFormEmpty()) {
        Swal.fire({
          title: 'Save Draft?',
          text: 'Do you want to save your progress as a draft for later?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Save Draft',
          cancelButtonText: 'Discard'
        }).then((result) => {
          if (!result.isConfirmed) {
            // Clear draft data
            clearFormCache();
          }
          onClose();
        });
      } else {
        // If form is empty, just clear and close
        clearFormCache();
        onClose();
      }
    } else {
      // Simple confirmation before closing if editing an existing guardian
      if (formData.firstName || formData.lastName || formData.phone || formData.email) {
        Swal.fire({
          title: 'Discard Changes?',
          text: 'Any unsaved changes will be lost.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, discard',
          cancelButtonText: 'No, keep editing'
        }).then((result) => {
          if (result.isConfirmed) {
            onClose();
          }
        });
      } else {
        onClose();
      }
    }
  };

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
            {isEdit ? 'Edit Guardian Information' : 'Add New Guardian'}
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
        <div className="p-6 relative">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-6 rounded-r-md backdrop-blur-sm shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-nextgen-blue-dark font-small">
                  {isEdit 
                    ? 'Update guardian information and associated children'
                    : 'Add a new guardian with contact information and child associations'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <div className="grid grid-cols-1 gap-4">
              {/* Guardian Information Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Guardian Information
                </h3>
                
                {/* Guardian Name Row */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                    required
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                    required
                  />
                </div>

                {/* Contact Info Row */}
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    type="tel"
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="^09\d{9}$"
                    className="h-[42px]"
                  />
                  <Input
                    type="email"
                    label="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                  />
                  <Input
                    type="select" 
                    label="Relationship"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleChange}
                    className="text-gray-900"
                    options={[
                      { value: "Parent", label: "Parent" },
                      { value: "Grandparent", label: "Grandparent" },
                      { value: "Sibling", label: "Sibling" },
                      { value: "Aunt/Uncle", label: "Aunt/Uncle" },
                      { value: "Legal Guardian", label: "Legal Guardian" },
                      { value: "Other", label: "Other" }
                    ]}
                    disabled={loading}
                  />
                </div>
              </motion.div>

              {/* Associated Children Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Associated Children
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  Select children that this guardian is responsible for.
                </p>
                
                {/* Search Field */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={childrenSearchQuery}
                      onChange={(e) => setChildrenSearchQuery(e.target.value)}
                      placeholder="Search children by name or ID..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nextgen-blue focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                {children.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-gray-500 text-sm">No children available to associate</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name / ID
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Age / Group
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {children
                          .filter(child => {
                            if (!childrenSearchQuery) return true;
                            const searchLower = childrenSearchQuery.toLowerCase();
                            const fullName = `${child.first_name} ${child.last_name}`.toLowerCase();
                            const formalId = (child.formal_id || '').toLowerCase();
                            return fullName.includes(searchLower) || formalId.includes(searchLower);
                          })
                          .map((child) => {
                          const isSelected = formData.associatedChildren.some(
                            c => c.childId === child.child_id
                          );
                          const isPrimary = formData.associatedChildren.some(
                            c => c.childId === child.child_id && c.isPrimary
                          );
                          
                          return (
                            <tr key={child.child_id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <input
                                  type="checkbox"
                                  value={child.child_id}
                                  checked={isSelected}
                                  onChange={handleChildSelection}
                                  className="h-4 w-4 text-nextgen-blue border-gray-300 rounded focus:ring-nextgen-blue"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {child.first_name} {child.last_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {child.formal_id || 'No ID'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {calculateAge(child.birthdate)} years<br />
                                <span className="text-xs">{child.age_categories?.category_name || 'N/A'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Form Actions - Bottom fixed section */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="relative"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      {isEdit ? 'Saving Changes...' : 'Adding Guardian...'}
                    </span>
                  ) : (
                    isEdit ? 'Save Changes' : 'Add Guardian'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AddGuardianForm;