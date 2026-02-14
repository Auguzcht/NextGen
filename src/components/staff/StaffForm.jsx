import { useState, useEffect } from 'react';
import supabase, { supabaseAdmin } from '../../services/supabase.js';
import { Input, Button, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import FileUpload from '../common/FileUpload.jsx';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext.jsx';

const StaffForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  // Add state to track if this is a restored draft
  const [isRestoredDraft, setIsRestoredDraft] = useState(false);
  
  // Dialog states
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
  // Initialize form data with either initialData, cached data, or defaults
  const [formData, setFormData] = useState(() => {
    // If editing, use initialData
    if (isEdit && initialData) {
      return {
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        email: initialData.email || '',
        phone_number: initialData.phone_number || '',
        role: initialData.role || 'Volunteer',
        is_active: initialData.is_active ?? true,
        access_level: initialData.access_level || 1
      };
    }
    
    // If not editing, check for cached draft
    const cachedDraft = localStorage.getItem('nextgen_staff_form_draft');
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
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      role: 'Volunteer',
      is_active: true,
      access_level: 1
    };
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Generate secure random password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special char
    
    // Fill rest with random characters
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPasswordData({
      password: newPassword,
      confirmPassword: newPassword
    });
    
    // Clear any password errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.password;
      delete newErrors.confirmPassword;
      return newErrors;
    });

    // Show success notification
    toast.success('Password Generated', {
      description: 'A secure password has been generated and filled in both fields.',
      duration: 2000
    });
  };
  const [imageUrl, setImageUrl] = useState(() => {
    // Check if we have a cached image URL
    if (!isEdit) {
      return localStorage.getItem('nextgen_staff_form_image_url') || '';
    }
    return '';
  });
  const [imagePath, setImagePath] = useState(() => {
    // Check if we have a cached image path
    if (!isEdit) {
      return localStorage.getItem('nextgen_staff_form_image_path') || '';
    }
    return '';
  });

  // Save form data to localStorage when it changes (only for new entries)
  useEffect(() => {
    if (!isEdit) {
      if (!isRestoredDraft || formHasData()) {
        localStorage.setItem('nextgen_staff_form_draft', JSON.stringify(formData));
      }
    }
  }, [formData, isEdit, isRestoredDraft]);

  // Save image data to localStorage when it changes (only for new entries)
  useEffect(() => {
    if (!isEdit && imageUrl) {
      localStorage.setItem('nextgen_staff_form_image_url', imageUrl);
    }
    if (!isEdit && imagePath) {
      localStorage.setItem('nextgen_staff_form_image_path', imagePath);
    }
  }, [imageUrl, imagePath, isEdit]);

  // Update the useEffect hook that handles initial data
  useEffect(() => {
    if (isEdit && initialData) {
      // Set image URL directly from initialData
      if (initialData.profile_image_url) {
        console.log('Setting initial photo URL:', initialData.profile_image_url);
        setImageUrl(initialData.profile_image_url);
        // Also set the image path if needed
        setImagePath(initialData.profile_image_path || `NextGen/staff-photos/${initialData.staff_id}`);
      }
    }
  }, [isEdit, initialData]);

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'phone_number') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData({
        ...formData,
        [name]: formattedPhone
      });
    } else if (name === 'role') {
      // Automatically set access_level based on role
      const selectedRole = roleOptions.find(r => r.value === value);
      const access_level = selectedRole ? selectedRole.accessLevel : 0;
      
      setFormData({
        ...formData,
        role: value,
        access_level: access_level
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
    
    // Clear password errors
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Philippine phone number validation (optional but if provided must be valid)
    if (formData.phone_number) {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        newErrors.phone_number = 'Phone number must start with 09 and have 11 digits';
      }
    }
    
    // Password validation - only validate if password is provided
    if (showPasswordFields && passwordData.password) {
      if (passwordData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      }
      
      if (passwordData.password !== passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper to check if the form has any data
  const formHasData = () => {
    return (
      formData.first_name.trim() !== '' ||
      formData.last_name.trim() !== '' ||
      formData.email.trim() !== '' ||
      formData.phone_number.trim() !== '' ||
      formData.role !== 'Volunteer' ||
      imageUrl !== ''
    );
  };

  // Helper to check if the form is completely empty
  const isFormEmpty = () => {
    return (
      formData.first_name.trim() === '' &&
      formData.last_name.trim() === '' &&
      formData.email.trim() === '' &&
      formData.phone_number.trim() === '' &&
      formData.role === 'Volunteer' &&
      imageUrl === ''
    );
  };

  // Helper to clear form cache
  const clearFormCache = () => {
    localStorage.removeItem('nextgen_staff_form_draft');
    localStorage.removeItem('nextgen_staff_form_image_url');
    localStorage.removeItem('nextgen_staff_form_image_path');
  };

  // Clean up local storage on form close
  const handleClose = () => {
    if (!isEdit) {
      // Ask user if they want to save their draft
      if (formHasData() && !isFormEmpty()) {
        setShowSaveDraftDialog(true);
      } else {
        clearFormCache();
        onClose();
      }
    } else {
      // If editing, show confirmation dialog
      if (formData.first_name || formData.last_name || formData.email || imageUrl !== initialData?.profile_image_url) {
        setShowDiscardDialog(true);
      } else {
        onClose();
      }
    }
  };

  const confirmSaveDraft = () => {
    // Keep draft data in localStorage
    setShowSaveDraftDialog(false);
    onClose();
  };

  const confirmDiscardDraft = () => {
    // Clear draft data
    clearFormCache();
    setShowSaveDraftDialog(false);
    onClose();
  };

  const confirmDiscardChanges = () => {
    setShowDiscardDialog(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Validation Error', {
        description: 'Please check all required fields'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (isEdit && initialData?.staff_id) {
        // Update existing staff
        const updateData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone_number?.trim() || null,
          role: formData.role,
          is_active: formData.is_active,
          access_level: formData.access_level,
          profile_image_url: imageUrl || null,
          profile_image_path: imagePath || null
        };

        const { error } = await supabase
          .from('staff')
          .update(updateData)
          .eq('staff_id', initialData.staff_id);
        
        if (error) throw error;

        // Handle password/credentials update or creation
        if (showPasswordFields && passwordData.password) {
          try {
            if (initialData.user_id) {
              // User already has auth account - update password
              const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                initialData.user_id,
                { password: passwordData.password }
              );
              
              if (passwordError) throw passwordError;
              
              toast.success('Updated!', {
                description: 'Staff member and password updated successfully.',
                duration: 2000
              });
            } else if (passwordData.password) {
              // User doesn't have auth account - create one with manual password
              const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: formData.email.trim(),
                password: passwordData.password,
                email_confirm: true,
                user_metadata: {
                  first_name: formData.first_name.trim(),
                  last_name: formData.last_name.trim(),
                  role: formData.role,
                  staff_id: initialData.staff_id,
                  access_level: formData.access_level
                }
              });

              if (authError) throw authError;

              // Link staff record to auth user
              const { error: linkError } = await supabase
                .from('staff')
                .update({ 
                  user_id: authData.user.id,
                  credentials_sent_at: new Date().toISOString(),
                  credentials_sent_count: (initialData.credentials_sent_count || 0) + 1
                })
                .eq('staff_id', initialData.staff_id);

              if (linkError) throw linkError;

              toast.success('Updated!', {
                description: 'Staff member updated and login credentials created.'
              });
            }
          } catch (credentialError) {
            console.error('Credential update error:', credentialError);
            toast.warning('Partial Success', {
              description: 'Staff member updated but credentials could not be ' + (initialData.user_id ? 'changed' : 'created') + '.',
              duration: 3000
            });
          }
        } else {
          toast.success('Updated!', {
            description: 'Staff member has been updated successfully.',
            duration: 1500
          });
        }
        
        // Call onSuccess and close after update
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        // Create new staff - first check if email already exists
        const { data: existingStaff, error: checkError } = await supabase
          .from('staff')
          .select('staff_id')
          .eq('email', formData.email.trim())
          .single();

        if (existingStaff) {
          throw new Error('A staff member with this email already exists');
        }

        // Insert staff record
        const insertData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone_number?.trim() || null,
          role: formData.role,
          is_active: formData.is_active,
          access_level: formData.access_level,
          profile_image_url: imageUrl || null,
          profile_image_path: imagePath || null,
          password_hash: '$2y$10$default' // Temporary password hash
        };

        const { data: newStaff, error: insertError } = await supabase
          .from('staff')
          .insert([insertData])
          .select('staff_id')
          .single();
        
        if (insertError) throw insertError;

        // Handle credential creation - only if password provided
        if (showPasswordFields && passwordData.password) {
          try {
            // Manual password provided - create auth account directly
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email: formData.email.trim(),
              password: passwordData.password,
              email_confirm: true,
              user_metadata: {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                role: formData.role,
                staff_id: newStaff.staff_id,
                access_level: formData.access_level
              }
            });

            if (authError) throw authError;

            // Link staff record to auth user
            const { error: updateError } = await supabase
              .from('staff')
              .update({ 
                user_id: authData.user.id,
                credentials_sent_at: new Date().toISOString(),
                credentials_sent_count: 1
              })
              .eq('staff_id', newStaff.staff_id);

            if (updateError) throw updateError;

            toast.success('Success!', {
              description: 'Staff member added with login credentials.'
            });
          } catch (authError) {
            console.error('Auth error:', authError);
            toast.warning('Partial Success', {
              description: 'Staff member added but login credentials could not be created. You can create them later using "Generate Credentials".',
              duration: 3000
            });
          }
        } else {
          toast.success('Added!', {
            description: 'Staff member has been added successfully.',
            duration: 1500
          });
        }

        // Clear form cache on successful submission
        clearFormCache();
        
        // Call onSuccess and close after create
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Error saving staff member:', error);
      toast.error('Error', {
        description: error.message || 'Failed to save staff member'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Role options with descriptions
  const roleOptions = [
    { value: 'Volunteer', label: 'Volunteer', description: 'No system access - volunteers only', accessLevel: 0 },
    { value: 'Team Leader', label: 'Team Leader', description: 'Access to dashboard, children, attendance & guardians', accessLevel: 3 },
    { value: 'Coordinator', label: 'Coordinator', description: 'Can manage staff and schedules', accessLevel: 5 },
    { value: 'Administrator', label: 'Administrator', description: 'Full system access', accessLevel: 10 }
  ];

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
            {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
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
                <p className="text-sm text-nextgen-blue-dark font-medium">
                  {isEdit 
                    ? 'Update staff member information and photo'
                    : 'Add a new staff member with optional login credentials'
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
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Profile Photo
                </h3>
                
                <div className="flex justify-center">
                  <div className="w-full max-w-md">
                    <FileUpload
                      category="NextGen/staff-photos"
                      onUploadComplete={(result) => {
                        console.log('Upload complete:', result);
                        setImageUrl(result.url);
                        setImagePath(result.path);
                      }}
                      onUploadError={(error) => {
                        toast.error('Upload Error', {
                          description: error.message
                        });
                      }}
                      onDeleteComplete={async () => {
                        setImageUrl('');
                        setImagePath('');
                        
                        // If editing, also update the database
                        if (isEdit && initialData?.staff_id) {
                          try {
                            const { error } = await supabase
                              .from('staff')
                              .update({
                                profile_image_url: null,
                                profile_image_path: null
                              })
                              .eq('staff_id', initialData.staff_id);
                            
                            if (error) throw error;
                          } catch (error) {
                            console.error('Error updating database:', error);
                          }
                        }
                        
                        toast.success('Photo Removed', {
                          description: 'Photo has been removed successfully',
                          duration: 1500
                        });
                      }}
                      accept="image/*"
                      maxSize={5}
                      initialPreview={initialData?.profile_image_url || imageUrl}
                      initialPath={initialData?.profile_image_path || imagePath}
                      previewClass="w-64 h-64 object-cover rounded-full mx-auto"
                      alt={`${formData.first_name} ${formData.last_name}`}
                      className="w-full mb-3"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Personal Information Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    error={errors.first_name}
                    required
                  />
                  <Input
                    label="Last Name *"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    error={errors.last_name}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    type="email"
                    label="Email *"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                    disabled={isEdit}
                    required
                  />
                  <Input
                    type="tel"
                    label="Phone Number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    error={errors.phone_number}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    pattern="^09\d{9}$"
                  />
                </div>
              </motion.div>

              {/* Role and Access Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Role & Access
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      {roleOptions.find(r => r.value === formData.role)?.description}
                    </p>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="is_active"
                        name="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="focus:ring-nextgen-blue h-4 w-4 text-nextgen-blue border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="is_active" className="font-medium text-gray-700">Active Status</label>
                      <p className="text-gray-500">Inactive staff members cannot log in or be assigned to services.</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Login Credentials Section - Available for all roles */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-nextgen-blue-dark">
                      {isEdit 
                        ? (initialData?.user_id ? 'Reset Password' : 'Add Login Credentials')
                        : 'Login Credentials (Optional)'
                      }
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="text-sm text-nextgen-blue hover:text-nextgen-blue-dark"
                    >
                      {showPasswordFields 
                        ? 'Hide' 
                        : (isEdit 
                            ? (initialData?.user_id ? 'Change Password' : 'Add Login')
                            : 'Create Login'
                          )
                      }
                    </button>
                  </div>

                  <AnimatePresence>
                    {showPasswordFields && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md mb-4">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-blue-700 flex-1">
                              {isEdit && initialData?.user_id
                                ? 'Change the password for this staff member\'s login credentials.'
                                : 'Set a password manually to create their login credentials. Leave blank if you want to use "Generate Credentials" later.'
                              }
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleGeneratePassword}
                              className="ml-3 whitespace-nowrap"
                              icon={
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                              }
                            >
                              Generate
                            </Button>
                          </div>
                        </div>

                        <Input
                          type="password"
                          label={isEdit && initialData?.user_id ? "New Password" : "Password (Optional)"}
                          name="password"
                          value={passwordData.password}
                          onChange={handlePasswordChange}
                          error={errors.password}
                          placeholder="At least 8 characters, or leave blank for email setup"
                          minLength={8}
                        />
                        <Input
                          type="password"
                          label={isEdit && initialData?.user_id ? "Confirm New Password" : "Confirm Password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          error={errors.confirmPassword}
                          placeholder="Re-enter password"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
            </div>
          </form>
        </div>

        {/* Form Actions - Bottom fixed section */}
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
              className="relative"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  {isEdit ? 'Saving Changes...' : 'Adding Staff...'}
                </span>
              ) : (
                isEdit ? 'Save Changes' : 'Add Staff Member'
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Save Draft Dialog */}
      <Dialog open={showSaveDraftDialog} onOpenChange={setShowSaveDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Draft?</DialogTitle>
            <DialogDescription>
              Do you want to save your progress as a draft for later?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={confirmDiscardDraft}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              onClick={confirmSaveDraft}
            >
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="outline"
              onClick={() => setShowDiscardDialog(false)}
            >
              No, keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDiscardChanges}
            >
              Yes, discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffForm;