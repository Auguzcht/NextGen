import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import supabase, { supabaseAdmin } from '../../services/supabase';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import ProfilePicture from '../common/ProfilePicture';
import Swal from 'sweetalert2';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, refreshUser, setIsUpdatingPassword } = useAuth();
  const fileUploadRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [originalData, setOriginalData] = useState({});

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      const initialFormData = {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || ''
      };
      const initialImageUrl = user.profile_image_url || '';
      const initialImagePath = user.profile_image_path || '';
      
      setFormData(initialFormData);
      setImageUrl(initialImageUrl);
      setImagePath(initialImagePath);
      
      // Store original data for comparison
      setOriginalData({
        ...initialFormData,
        profile_image_url: initialImageUrl,
        profile_image_path: initialImagePath
      });
    }
  }, [isOpen, user]);

  // Format phone number helper
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2 && !cleaned.startsWith('09')) {
      return '09';
    }
    return cleaned.slice(0, 11);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone_number') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (optional but if provided must be valid)
    if (formData.phone_number) {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        newErrors.phone_number = 'Phone number must start with 09 and have 11 digits';
      }
    }
    
    // Password validation if changing password (all fields must be filled together)
    const hasPasswordInput = passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword;
    
    if (hasPasswordInput) {
      if (!passwordData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password';
      }
      
      if (!passwordData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (passwordData.newPassword.length < 8) {
        newErrors.newPassword = 'New password must be at least 8 characters';
      }
      
      if (!passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your new password';
      } else if (passwordData.newPassword !== passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if any changes were made
  const hasChanges = () => {
    const formChanged = Object.keys(formData).some(key => 
      formData[key] !== originalData[key]
    );
    const imageChanged = imageUrl !== originalData.profile_image_url || 
                        imagePath !== originalData.profile_image_path;
    const passwordChanged = passwordData.currentPassword || 
                           passwordData.newPassword || 
                           passwordData.confirmPassword;
    
    return formChanged || imageChanged || passwordChanged;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please check all required fields',
        customClass: {
          container: 'swal-high-z-index'
        },
        didOpen: () => {
          // Ensure SweetAlert appears above modal
          const swalContainer = document.querySelector('.swal2-container');
          if (swalContainer) {
            swalContainer.style.zIndex = '10000';
          }
        }
      });
      return;
    }

    // Check if any changes were made
    if (!hasChanges()) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made to your profile.',
        didOpen: () => {
          const swalContainer = document.querySelector('.swal2-container');
          if (swalContainer) {
            swalContainer.style.zIndex = '10000';
          }
        }
      });
      return;
    }

    // Confirm before saving
    const result = await Swal.fire({
      title: 'Save Changes?',
      text: 'Are you sure you want to update your profile?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e40af',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, save changes',
      cancelButtonText: 'Cancel',
      didOpen: () => {
        const swalContainer = document.querySelector('.swal2-container');
        if (swalContainer) {
          swalContainer.style.zIndex = '10000';
        }
      }
    });

    if (!result.isConfirmed) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update staff table
      const updateData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number?.trim() || null,
        profile_image_url: imageUrl || null,
        profile_image_path: imagePath || null
      };

      const { error: staffError } = await supabase
        .from('staff')
        .update(updateData)
        .eq('staff_id', user.staff_id);
      
      if (staffError) throw staffError;

      // Update Supabase auth metadata
      if (user.user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          user.user_id,
          {
            user_metadata: {
              first_name: formData.first_name.trim(),
              last_name: formData.last_name.trim(),
              profile_image_url: imageUrl || null
            }
          }
        );
        
        if (authError) {
          console.error('Error updating auth metadata:', authError);
        }
      }

      // Handle password change if requested (check if any password field has input)
      if (passwordData.newPassword && passwordData.currentPassword) {
        setIsUpdatingPassword(true); // Prevent auth listener interference
        
        try {
          console.log('Verifying current password...');
          
          // Verify current password by attempting to sign in
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: passwordData.currentPassword
          });

          if (signInError) {
            setIsUpdatingPassword(false);
            throw new Error('Current password is incorrect');
          }

          console.log('Password verified, updating to new password...');

          // Update password with timeout protection
          const updatePromise = supabase.auth.updateUser({
            password: passwordData.newPassword
          });
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
          
          const { error: passwordError } = await Promise.race([updatePromise, timeoutPromise]);

          if (passwordError) {
            setIsUpdatingPassword(false);
            throw passwordError;
          }

          console.log('Password updated successfully');

          // Wait a bit before re-enabling auth listener
          await new Promise(resolve => setTimeout(resolve, 500));
          setIsUpdatingPassword(false);

          await Swal.fire({
            icon: 'success',
            title: 'Profile & Password Updated',
            text: 'Your profile and password have been updated successfully!',
            timer: 2000,
            allowOutsideClick: false,
            didOpen: () => {
              const swalContainer = document.querySelector('.swal2-container');
              if (swalContainer) swalContainer.style.zIndex = '10000';
            }
          });
        } catch (passwordError) {
          console.error('Password update error:', passwordError);
          setIsUpdatingPassword(false);
          throw passwordError;
        }
      } else {
        await Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your profile has been updated successfully!',
          timer: 2000,
          allowOutsideClick: false,
          didOpen: () => {
            const swalContainer = document.querySelector('.swal2-container');
            if (swalContainer) swalContainer.style.zIndex = '10000';
          }
        });
      }

      // Refresh user data and wait for it to complete
      if (refreshUser) {
        const refreshSuccess = await refreshUser();
        if (!refreshSuccess) {
          console.warn('Failed to refresh user data, but changes were saved');
        }
        // Longer delay to ensure state updates propagate through React
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Reset password fields and close modal
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      onClose();

    } catch (error) {
      console.error('Error updating profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update profile. Please try again.',
        didOpen: () => {
          const swalContainer = document.querySelector('.swal2-container');
          if (swalContainer) swalContainer.style.zIndex = '10000';
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Profile Settings"
      size="5xl"
      variant="primary"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-6 max-h-[calc(90vh-200px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC'
        }}
        >
          {/* Left Column - Profile Photo & Account Info */}
          <div className="col-span-1 space-y-6">
            {/* Profile Photo Display */}
            <motion.div
              className="flex flex-col items-center mt-12"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ProfilePicture
                imageUrl={imageUrl}
                onUploadComplete={async (file) => {
                  try {
                    setIsLoading(true);
                    
                    // Upload using Firebase Storage API directly (same pattern as FileUpload)
                    const storageRef = ref(storage, `NextGen/staff-photos/${Date.now()}_${file.name}`);
                    const metadata = {
                      cacheControl: 'public,max-age=31536000',
                      contentType: file.type
                    };
                    
                    const snapshot = await uploadBytes(storageRef, file, metadata);
                    const url = await getDownloadURL(storageRef);
                    
                    setImageUrl(url);
                    setImagePath(snapshot.ref.fullPath);
                    
                    Swal.fire({
                      icon: 'success',
                      title: 'Photo Updated',
                      text: 'Profile photo has been updated successfully',
                      timer: 1500,
                      didOpen: () => {
                        const swalContainer = document.querySelector('.swal2-container');
                        if (swalContainer) swalContainer.style.zIndex = '10000';
                      }
                    });
                  } catch (error) {
                    Swal.fire({
                      icon: 'error',
                      title: 'Upload Error',
                      text: error.message,
                      didOpen: () => {
                        const swalContainer = document.querySelector('.swal2-container');
                        if (swalContainer) swalContainer.style.zIndex = '10000';
                      }
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                onDelete={async () => {
                  setImageUrl('');
                  setImagePath('');
                  Swal.fire({
                    icon: 'success',
                    title: 'Photo Removed',
                    text: 'Profile photo has been removed',
                    timer: 1500,
                    didOpen: () => {
                      const swalContainer = document.querySelector('.swal2-container');
                      if (swalContainer) swalContainer.style.zIndex = '10000';
                    }
                  });
                }}
                userGradient={`bg-gradient-to-br from-nextgen-blue to-nextgen-blue-dark`}
                initials={`${formData.first_name?.charAt(0) || '?'}${formData.last_name?.charAt(0) || ''}`}
                size="lg"
              />
            </motion.div>

            {/* Account Information */}
            <motion.div 
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-nextgen-blue/20 p-5 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-nextgen-blue" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h4 className="text-base font-semibold text-nextgen-blue-dark">Account Information</h4>
              </div>
              <div className="space-y-3">
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Role</p>
                  <Badge variant="primary" size="sm">
                    {user?.role || 'Staff'}
                  </Badge>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Access Level</p>
                  <p className="text-sm font-semibold text-gray-900">
                    Level {user?.access_level || '1'}
                  </p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Account Status</p>
                  <Badge 
                    variant={user?.is_active ? "success" : "danger"} 
                    size="sm"
                  >
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Last Login</p>
                  <p className="text-xs font-medium text-gray-900">
                    {user?.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'First login'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Personal Info & Password */}
          <div className="col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg border border-nextgen-blue/10 p-6 shadow-sm">
                <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Personal Information</h4>
                
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
                    disabled
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
              </div>

              {/* Password Section */}
              <div className="bg-white rounded-lg border border-nextgen-blue/10 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h4 className="text-lg font-medium text-nextgen-blue-dark">Password & Security</h4>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      label="Current Password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      error={errors.currentPassword}
                      placeholder="Leave blank to keep current"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showCurrentPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      label="New Password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      error={errors.newPassword}
                      placeholder="At least 8 characters"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      label="Confirm New Password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      error={errors.confirmPassword}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-gray-700">
                        <p className="font-medium mb-1">Password Requirements:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                          <li>At least 8 characters long</li>
                          <li>Leave all fields blank to keep current password</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  Saving
                  <svg className="animate-spin ml-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
    </Modal>
  );
};

export default ProfileSettingsModal;
