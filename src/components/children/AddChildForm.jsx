import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Card, Button, Input, Badge, Alert } from '../ui';
import { motion } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../services/firebase';
import FileUpload from '../common/FileUpload.jsx';
import Swal from 'sweetalert2';

// Add isEdit and initialData props
const AddChildForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  // Map the initialData to match form structure
  const mapInitialData = (data) => {
    if (!data) return null;
    
    console.log('Mapping initial data:', data); // Keep this debug log
    
    // Destructure child_guardian to make it clearer
    const primaryGuardian = data.child_guardian?.[0];
    const guardianInfo = primaryGuardian?.guardians;
    
    return {
      firstName: data.first_name || '',
      middleName: data.middle_name || '',
      lastName: data.last_name || '',
      birthdate: data.birthdate || '',
      gender: data.gender || '',
      formalId: data.formal_id || '',
      ageCategory: data.age_category_id || '',
      guardianFirstName: guardianInfo?.first_name || '',
      guardianLastName: guardianInfo?.last_name || '',
      guardianPhone: guardianInfo?.phone_number || '',
      guardianEmail: guardianInfo?.email || '',
      // Get relationship from the guardians table, not from child_guardian
      guardianRelationship: guardianInfo?.relationship || 'Parent',
      notes: data.notes || ''
    };
  };

  const [ageCategories, setAgeCategories] = useState([]);
  // Initialize form data with either initialData, cached data, or defaults
  const [formData, setFormData] = useState(() => {
    // If editing, use initialData
    if (isEdit && initialData) {
      return mapInitialData(initialData);
    }
    
    // If not editing, check for cached draft
    const cachedDraft = localStorage.getItem('nextgen_child_form_draft');
    if (cachedDraft && !isEdit) {
      try {
        const parsedDraft = JSON.parse(cachedDraft);
        
        // Only set the draft flag to true if there's actual content in the draft
        // and it's not an empty form
        const hasContent = Object.values(parsedDraft).some(val => 
          typeof val === 'string' ? val.trim() !== '' : val !== null
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
      middleName: '',
      lastName: '',
      birthdate: '',
      gender: '',
      guardianFirstName: '',
      guardianLastName: '',
      guardianPhone: '',
      guardianEmail: '',
      guardianRelationship: 'Parent',
      notes: ''
    };
  });
  
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [imageUrl, setImageUrl] = useState(() => {
    // Check if we have a cached image URL
    if (!isEdit) {
      return localStorage.getItem('nextgen_child_form_image_url') || '';
    }
    return '';
  });
  const [imagePath, setImagePath] = useState(() => {
    // Check if we have a cached image path
    if (!isEdit) {
      return localStorage.getItem('nextgen_child_form_image_path') || '';
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  // Add a state to track if this is a restored draft
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  
  // Save form data to localStorage when it changes (only for new entries)
  useEffect(() => {
    if (!isEdit) {
      // Don't update localStorage if this is the first time the form is being filled
      // (only update it for actual changes after initial render)
      if (!isRestoredDraft || formHasData()) {
        localStorage.setItem('nextgen_child_form_draft', JSON.stringify(formData));
      }
    }
  }, [formData, isEdit, isRestoredDraft]);
  
  // Save image data to localStorage when it changes (only for new entries)
  useEffect(() => {
    if (!isEdit && imageUrl) {
      localStorage.setItem('nextgen_child_form_image_url', imageUrl);
    }
    if (!isEdit && imagePath) {
      localStorage.setItem('nextgen_child_form_image_path', imagePath);
    }
  }, [imageUrl, imagePath, isEdit]);

  useEffect(() => {
    fetchAgeCategories();
  }, []);

  // Update the useEffect hook that handles initial data
  useEffect(() => {
    if (isEdit && initialData) {
      // Set form data
      setFormData(mapInitialData(initialData));
      
      // Set image URL directly from initialData
      if (initialData.photo_url) {
        console.log('Setting initial photo URL:', initialData.photo_url);
        setImageUrl(initialData.photo_url);
        // Also set the image path if needed
        setImagePath(`NextGen/child-photos/${initialData.child_id}`);
      }
    }
  }, [isEdit, initialData]);

  const fetchAgeCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('age_categories')
        .select('*')
        .order('min_age', { ascending: true });

      if (error) throw error;
      setAgeCategories(data || []);
    } catch (error) {
      console.error('Error fetching age categories:', error);
    }
  };

  // Format phone number helper function
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Ensure it starts with '09'
    if (cleaned.length >= 2) {
      if (!cleaned.startsWith('09')) {
        return '09';
      }
    }
    
    // Truncate to 11 digits
    return cleaned.slice(0, 11);
  };

  // Update the handleChange function
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'guardianPhone') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedPhone
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleImageUploadComplete = (result) => {
    console.log('Upload complete:', result); // Add this debug log
    setImageUrl(result.url);
    setImagePath(result.path);
    setNotification({
      type: 'success',
      message: 'Photo uploaded successfully'
    });
  };

  const handleImageUploadError = (error) => {
    setNotification({
      type: 'error',
      message: `Failed to upload photo: ${error.message}`
    });
  };

  const handleImageDelete = async () => {
    if (imagePath) {
      try {
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
        setImageUrl('');
        setImagePath('');
        
        // Clear cached image data
        if (!isEdit) {
          localStorage.removeItem('nextgen_child_form_image_url');
          localStorage.removeItem('nextgen_child_form_image_path');
        }
        
        setNotification({
          type: 'success',
          message: 'Photo removed successfully'
        });
      } catch (error) {
        console.error('Error deleting image:', error);
        setNotification({
          type: 'error',
          message: 'Failed to remove photo'
        });
      }
    }
  };

  // Enhanced validation function
  const validate = () => {
    const newErrors = {};
    
    // Required fields validation (keep existing)
    const requiredFields = {
      firstName: 'Please enter the child\'s first name',
      lastName: 'Please enter the child\'s last name',
      birthdate: 'Please select the child\'s birth date',
      gender: 'Please select the child\'s gender',
      guardianFirstName: 'Please enter the guardian\'s first name',
      guardianLastName: 'Please enter the guardian\'s last name'
    };

    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!formData[field]?.trim()) {
        newErrors[field] = message;
      }
    });

    // Contact method validation with improved messages
    if (!formData.guardianPhone && !formData.guardianEmail) {
      newErrors.guardianPhone = 'At least one contact method is required';
      newErrors.guardianEmail = 'At least one contact method is required';
    }

    // Philippine phone number validation (09XXXXXXXXX format)
    if (formData.guardianPhone) {
      const phoneRegex = /^09\d{9}$/;
      const cleanPhone = formData.guardianPhone.replace(/\D/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.guardianPhone = 'Phone number must start with 09 and have 11 digits';
      }
    }

    // Stricter email validation
    if (formData.guardianEmail) {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.guardianEmail)) {
        newErrors.guardianEmail = 'Please enter a valid email address';
      }
    }

    // Age validation
    const birthDate = new Date(formData.birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (formData.birthdate && (age < 4 || age > 12)) {
      newErrors.birthdate = 'Child must be between 4 and 12 years old';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clean up local storage on form close
  const handleClose = () => {
    if (!isEdit) {
      // Ask user if they want to save their draft
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
      // If editing, just close
      onClose();
    }
  };

  // Helper to check if the form has any data
  const formHasData = () => {
    return (
      formData.firstName.trim() !== '' ||
      formData.lastName.trim() !== '' ||
      formData.middleName.trim() !== '' ||
      formData.birthdate !== '' ||
      formData.gender !== '' ||
      formData.guardianFirstName.trim() !== '' ||
      formData.guardianLastName.trim() !== '' ||
      formData.guardianPhone.trim() !== '' ||
      formData.guardianEmail.trim() !== '' ||
      formData.guardianRelationship !== 'Parent' ||
      formData.notes.trim() !== '' ||
      imageUrl !== ''
    );
  };

  // Helper to check if the form is completely empty
  const isFormEmpty = () => {
    return (
      formData.firstName.trim() === '' &&
      formData.lastName.trim() === '' &&
      formData.middleName.trim() === '' &&
      formData.birthdate === '' &&
      formData.gender === '' &&
      formData.guardianFirstName.trim() === '' &&
      formData.guardianLastName.trim() === '' &&
      formData.guardianPhone.trim() === '' &&
      formData.guardianEmail.trim() === '' &&
      formData.guardianRelationship === 'Parent' &&
      formData.notes.trim() === '' &&
      imageUrl === ''
    );
  };

  // Helper to clear form cache
  const clearFormCache = () => {
    localStorage.removeItem('nextgen_child_form_draft');
    localStorage.removeItem('nextgen_child_form_image_url');
    localStorage.removeItem('nextgen_child_form_image_path');
  };

  // Update handleSubmit to handle both create and edit
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

    setLoading(true); // Start loading
    let photoUpdateNeeded = false;

    try {
      // Show loading indicator only in button, not full screen
      if (isEdit) {
        photoUpdateNeeded = isEdit && imageUrl && imageUrl !== initialData?.photo_url;

        // Update existing child with photo if changed
        const { error: updateError } = await supabase
          .from('children')
          .update({
            first_name: formData.firstName.trim(),
            middle_name: formData.middleName?.trim() || null,
            last_name: formData.lastName.trim(),
            birthdate: formData.birthdate,
            gender: formData.gender.trim(),
            photo_url: imageUrl || initialData.photo_url, // Remove photo_path
            notes: formData.notes?.trim() || null
          })
          .eq('child_id', initialData.child_id);

        if (updateError) throw updateError;

        // Update guardian info with correct relationship
        const { error: guardianError } = await supabase
          .from('guardians')
          .update({
            first_name: formData.guardianFirstName.trim(),
            last_name: formData.guardianLastName.trim(),
            phone_number: formData.guardianPhone?.trim() || null,
            email: formData.guardianEmail?.trim() || null,
            relationship: formData.guardianRelationship // Make sure this is included
          })
          .eq('guardian_id', initialData.child_guardian[0].guardian_id);

        if (guardianError) throw guardianError;

        // Update child_guardian relationship if needed
        const { error: relationshipError } = await supabase
          .from('child_guardian')
          .update({
            is_primary: true // Ensure primary status is maintained
          })
          .eq('child_id', initialData.child_id)
          .eq('guardian_id', initialData.child_guardian[0].guardian_id);

        if (relationshipError) throw relationshipError;
      } else {
        // First register the child
        const { data: childData, error: childError } = await supabase.rpc('register_new_child', {
          p_first_name: formData.firstName.trim(),
          p_middle_name: formData.middleName?.trim() || null,
          p_last_name: formData.lastName.trim(),
          p_birthdate: formData.birthdate,
          p_gender: formData.gender.trim(),
          p_guardian_first_name: formData.guardianFirstName.trim(),
          p_guardian_last_name: formData.guardianLastName.trim(),
          p_guardian_phone: formData.guardianPhone?.trim() || null,
          p_guardian_email: formData.guardianEmail?.trim() || null,
          p_guardian_relationship: formData.guardianRelationship.trim(),
          p_notes: formData.notes?.trim() || null
        });

        if (childError) {
          throw new Error(`Registration failed: ${childError.message}`);
        }

        if (!childData || !childData[0]?.child_id) {
          throw new Error('No child ID returned from registration');
        }

        // Update the photo URL immediately after registration if we have one
        if (imageUrl) { // Only check for imageUrl
          const { error: photoError } = await supabase
            .from('children')
            .update({ 
              photo_url: imageUrl // Remove photo_path
            })
            .eq('child_id', childData[0].child_id);

          if (photoError) {
            console.error('Error updating photo:', photoError);
            throw new Error('Failed to update child photo');
          }
        }
      }

      // Clear form cache on successful submission
      if (!isEdit) {
        clearFormCache();
      }

      // Call onSuccess
      onSuccess();

      // Close form
      onClose();

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message
      });

      // Clean up photo if needed
      if (photoUpdateNeeded && imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (cleanupError) {
          console.warn('Error cleaning up image:', cleanupError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Form section animation variants
  const formSectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  // Update the form title and button text based on mode
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
          <h2 className="text-xl font-semibold text-[#571C1F]">
            {isEdit ? 'Edit Child Information' : 'Register New Child'}
          </h2>
          <button 
            onClick={handleClose} // Use handleClose instead of onClose
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
                <p className="text-sm text-nextgen-blue-dark font-medium">
                  {isEdit 
                    ? 'Update child information and photo'
                    : 'Register a new child with their photo and details'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 relative">
            <div className="grid grid-cols-1 gap-4">
              {/* Photo Section - Full width */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-[#571C1F] mb-4">
                  Child Photo
                </h3>
                
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <FileUpload
                      category="NextGen/child-photos"
                      onUploadComplete={(result) => {
                        console.log('Upload complete:', result);
                        setImageUrl(result.url);
                        setImagePath(result.path);
                      }}
                      onUploadError={(error) => {
                        Swal.fire({
                          icon: 'error',
                          title: 'Upload Error',
                          text: error.message
                        });
                      }}
                      onDeleteComplete={() => {
                        setImageUrl('');
                        setImagePath('');
                        Swal.fire({
                          icon: 'success',
                          title: 'Photo Removed',
                          text: 'Photo has been removed successfully',
                          timer: 1500
                        });
                      }}
                      accept="image/*"
                      maxSize={5}
                      initialPreview={initialData?.photo_url || imageUrl} // Use initialData.photo_url first
                      previewClass="w-full h-72 object-cover rounded-md"
                      alt={`${formData.firstName} ${formData.lastName}`}
                      className="w-full mb-3"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Child Information Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-lg font-medium text-[#571C1F] mb-4">
                  Child Information
                </h3>
                
                {/* Basic Info - First Row */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Input
                    label="First Name *"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                  />
                  <Input
                    label="Middle Name"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                  />
                  <Input
                    label="Last Name *"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                  />
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label="Birth Date *"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange}
                    error={errors.birthdate}
                    max={new Date().toISOString().split('T')[0]}
                    disabled={isEdit}
                    className="h-[42px]"
                    required
                  />
                  <Input
                    type="select"
                    label="Gender *"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    error={errors.gender}
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" }
                    ]}
                    disabled={isEdit} // Correct - gender should be locked
                  />
                </div>

                {/* Formal ID - should be read-only */}
                {isEdit && (
                  <div className="mt-4">
                    <Input
                      label="Formal ID"
                      name="formalId"
                      value={formData.formalId}
                      disabled={true}
                      className="bg-gray-50"
                    />
                  </div>
                )}

                {/* Age Category - should be read-only in edit mode */}
                {isEdit && ageCategories.length > 0 && (
                  <div className="mt-4">
                    <Input
                      type="select"
                      label="Age Category"
                      name="ageCategory"
                      value={formData.ageCategory}
                      options={ageCategories.map(cat => ({
                        value: cat.category_id,
                        label: cat.category_name
                      }))}
                      disabled={true}
                      className="bg-gray-50"
                    />
                  </div>
                )}
              </motion.div>

              {/* Guardian Information Section - Keep as is */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-lg font-medium text-[#571C1F] mb-4">
                  Guardian Information
                </h3>
                
                {/* Guardian Name Row */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    label="First Name *"
                    name="guardianFirstName"
                    value={formData.guardianFirstName}
                    onChange={handleChange}
                    error={errors.guardianFirstName}
                  />
                  <Input
                    label="Last Name *"
                    name="guardianLastName"
                    value={formData.guardianLastName}
                    onChange={handleChange}
                    error={errors.guardianLastName}
                  />
                </div>

                {/* Contact Info Row */}
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    type="tel"
                    label="Phone Number"
                    name="guardianPhone"
                    value={formData.guardianPhone}
                    onChange={handleChange}
                    error={errors.guardianPhone}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="^09\d{9}$"
                    className="h-[42px]"
                  />
                  <Input
                    type="email"
                    label="Email"
                    name="guardianEmail"
                    value={formData.guardianEmail}
                    onChange={handleChange}
                    error={errors.guardianEmail}
                  />
                  <Input
                    type="select" 
                    label="Relationship *"
                    name="guardianRelationship"
                    value={formData.guardianRelationship}
                    onChange={handleChange}
                    className="text-gray-900"
                    options={[
                      { value: "", label: "Select Relationship" },  // Added default option
                      { value: "Parent", label: "Parent" },
                      { value: "Grandparent", label: "Grandparent" },
                      { value: "Sibling", label: "Sibling" },
                      { value: "Aunt/Uncle", label: "Aunt/Uncle" },
                      { value: "Legal Guardian", label: "Legal Guardian" },
                      { value: "Other", label: "Other" }
                    ]}
                    error={errors.guardianRelationship}
                    disabled={loading}
                    required
                  />
                </div>
              </motion.div>

              {/* Additional Notes Section - New */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h3 className="text-lg font-medium text-[#571C1F] mb-4">
                  Additional Notes
                </h3>
                
                <Input
                  type="textarea"
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Add any additional notes or important information about the child"
                  className="w-full"
                />
              </motion.div>
            </div>

            {/* Form Actions - Move to bottom fixed section */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose} // Use handleClose instead of onClose
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="relative"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      {isEdit ? 'Saving Changes...' : 'Registering Child...'}
                    </span>
                  ) : (
                    isEdit ? 'Save Changes' : 'Register Child'
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

export default AddChildForm;