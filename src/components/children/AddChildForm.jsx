import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Card, Button, Input, Badge, Alert } from '../ui';
import { motion } from 'framer-motion';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../services/firebase';
import FileUpload from '../common/FileUpload.jsx';

// Add isEdit and initialData props
const AddChildForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  // Map the initialData to match form structure
  const mapInitialData = (data) => {
    if (!data) return null;
    
    console.log('Mapping initial data:', data); // Add this debug log
    
    return {
      firstName: data.first_name || '',
      middleName: data.middle_name || '',
      lastName: data.last_name || '',
      birthdate: data.birthdate || '',
      gender: data.gender || '',
      formalId: data.formal_id || '',
      ageCategory: data.age_category_id || '',
      guardianFirstName: data.child_guardian?.[0]?.guardians?.first_name || '',
      guardianLastName: data.child_guardian?.[0]?.guardians?.last_name || '',
      guardianPhone: data.child_guardian?.[0]?.guardians?.phone_number || '',
      guardianEmail: data.child_guardian?.[0]?.guardians?.email || '',
      guardianRelationship: data.child_guardian?.[0]?.guardians?.relationship || 'Parent',
      notes: data.notes || ''
    };
  };

  const [loading, setLoading] = useState(false);
  const [ageCategories, setAgeCategories] = useState([]);
  // Update initial form data
  const [formData, setFormData] = useState(mapInitialData(initialData) || {
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
  });
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');

  useEffect(() => {
    fetchAgeCategories();
  }, []);

  // Add useEffect to handle image URL from initialData
  useEffect(() => {
    if (initialData?.photo_url) {
      setImageUrl(initialData.photo_url);
    }
    if (initialData?.photo_path) {
      setImagePath(initialData.photo_path);
    }
  }, [initialData]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleImageUploadComplete = (result) => {
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
    
    // Required fields validation with better messages
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

    // Contact method validation
    if (!formData.guardianPhone && !formData.guardianEmail) {
      newErrors.guardianContact = 'Please provide at least one contact method (phone or email)';
    }

    // Email format validation
    if (formData.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardianEmail)) {
      newErrors.guardianEmail = 'Please enter a valid email address';
    }

    // Phone format validation (optional)
    if (formData.guardianPhone && !/^\+?[\d\s-()]{10,}$/.test(formData.guardianPhone)) {
      newErrors.guardianPhone = 'Please enter a valid phone number';
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

  // Update handleSubmit to handle both create and edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      setNotification({
        type: 'error',
        message: 'Please correct the errors in the form'
      });
      return;
    }
    
    setLoading(true);
    try {
      if (isEdit) {
        // Update existing child
        const { error: updateError } = await supabase
          .from('children')
          .update({
            first_name: formData.firstName.trim(),
            middle_name: formData.middleName?.trim() || null,
            last_name: formData.lastName.trim(),
            birthdate: formData.birthdate,
            gender: formData.gender.trim(),
          })
          .eq('child_id', initialData.child_id);

        if (updateError) throw updateError;

        // Update guardian info
        const { error: guardianError } = await supabase
          .from('guardians')
          .update({
            first_name: formData.guardianFirstName.trim(),
            last_name: formData.guardianLastName.trim(),
            phone_number: formData.guardianPhone?.trim() || null,
            email: formData.guardianEmail?.trim() || null,
            relationship: formData.guardianRelationship.trim()
          })
          .eq('guardian_id', initialData.child_guardian[0].guardian_id);

        if (guardianError) throw guardianError;
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
          p_guardian_relationship: formData.guardianRelationship.trim()
        });

        if (childError) {
          throw new Error(`Registration failed: ${childError.message}`);
        }

        if (!childData || !childData[0]?.child_id) {
          throw new Error('No child ID returned from registration');
        }

        // Only attempt photo update if we have both childData and imageUrl
        if (imageUrl) {
          const { error: photoError } = await supabase
            .from('children')
            .update({ 
              photo_url: imageUrl,
              photo_path: imagePath 
            })
            .eq('child_id', childData[0].child_id);

          if (photoError) {
            console.error('Error updating photo:', photoError);
          }
        }
      }

      setNotification({
        type: 'success',
        message: isEdit ? 'Child updated successfully!' : 'Child registered successfully!'
      });
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (error) {
      console.error(isEdit ? 'Error updating child:' : 'Error registering child:', error);
      setNotification({
        type: 'error',
        message: `Failed to ${isEdit ? 'update' : 'register'} child: ${error.message}`
      });

      // Clean up photo if uploaded
      if (imagePath) {
        try {
          const imageRef = ref(storage, imagePath);
          await deleteObject(imageRef);
        } catch (cleanupError) {
          // Ignore cleanup errors
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
            onClick={onClose}
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

          {/* Existing form content */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                      category="child-photos"
                      onUploadComplete={handleImageUploadComplete}
                      onUploadError={handleImageUploadError}
                      onDeleteComplete={handleImageDelete}
                      accept="image/*"
                      maxSize={5}
                      initialPreview={imageUrl}
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
                    className="h-[42px]"
                    max={new Date().toISOString().split('T')[0]}
                    disabled={isEdit} // Correct - birthdate should be locked
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
            </div>

            {/* Form Actions - Move to bottom fixed section */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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