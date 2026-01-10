import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import supabase, { supabaseAdmin } from '../../services/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import FileUpload from '../common/FileUpload';
import Swal from 'sweetalert2';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  
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

  // Initialize form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || ''
      });
      setImageUrl(user.profile_image_url || '');
      setImagePath(user.profile_image_path || '');
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
    
    // Password validation if changing password
    if (showPasswordSection) {
      if (!passwordData.currentPassword) {
        newErrors.currentPassword = 'Current password is required';
      }
      
      if (passwordData.newPassword) {
        if (passwordData.newPassword.length < 8) {
          newErrors.newPassword = 'New password must be at least 8 characters';
        }
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      } else {
        newErrors.newPassword = 'New password is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      // Handle password change if requested
      if (showPasswordSection && passwordData.newPassword) {
        // Verify current password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordData.currentPassword
        });

        if (signInError) {
          throw new Error('Current password is incorrect');
        }

        // Update password
        const { error: passwordError } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });

        if (passwordError) throw passwordError;

        Swal.fire({
          icon: 'success',
          title: 'Profile & Password Updated',
          text: 'Your profile and password have been updated successfully!',
          timer: 2000
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your profile has been updated successfully!',
          timer: 2000
        });
      }

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      // Reset password fields and close modal
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
      onClose();

    } catch (error) {
      console.error('Error updating profile:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update profile. Please try again.'
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
    setShowPasswordSection(false);
    setErrors({});
    onClose();
  };

  const handleSendPasswordResetEmail = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Email Sent',
        text: 'Password reset instructions have been sent to your email.',
        timer: 3000
      });
    } catch (error) {
      console.error('Error sending reset email:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Failed to send password reset email. Please try again.'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-nextgen-blue to-nextgen-blue-dark px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Profile Settings</h3>
                  <p className="text-sm text-white/80">Update your personal information</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Profile Photo Section */}
            <div className="bg-white rounded-lg border border-nextgen-blue/10 p-6 shadow-sm">
              <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Profile Photo</h4>
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <FileUpload
                    category="NextGen/staff-photos"
                    onUploadComplete={(result) => {
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
                    onDeleteComplete={async () => {
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
                    initialPreview={imageUrl}
                    initialPath={imagePath}
                    previewClass="w-32 h-32 object-cover rounded-full mx-auto"
                    alt={`${formData.first_name} ${formData.last_name}`}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
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

              {formData.email !== user.email && (
                <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-md">
                  <p className="text-sm text-yellow-700">
                    ⚠️ Changing your email will require re-verification
                  </p>
                </div>
              )}
            </div>

            {/* Password Section */}
            <div className="bg-white rounded-lg border border-nextgen-blue/10 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-nextgen-blue-dark">Password</h4>
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm text-nextgen-blue hover:text-nextgen-blue-dark font-medium"
                >
                  {showPasswordSection ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              <AnimatePresence>
                {showPasswordSection ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <Input
                      type="password"
                      label="Current Password *"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      error={errors.currentPassword}
                      placeholder="Enter your current password"
                    />
                    <Input
                      type="password"
                      label="New Password *"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      error={errors.newPassword}
                      placeholder="At least 8 characters"
                      minLength={8}
                    />
                    <Input
                      type="password"
                      label="Confirm New Password *"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      error={errors.confirmPassword}
                      placeholder="Re-enter new password"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-sm text-gray-600 mb-3">
                      Keep your account secure with a strong password
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendPasswordResetEmail}
                      icon={
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                    >
                      Send Password Reset Email
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account Info */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 rounded-r-md">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-nextgen-blue mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-nextgen-blue-dark">
                  <p className="font-semibold mb-1">Account Information</p>
                  <p className="text-gray-700">Role: <span className="font-medium">{user?.role || 'Staff'}</span></p>
                  <p className="text-gray-700">Last Login: <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
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
              onClick={handleSubmit}
              disabled={isLoading}
              isLoading={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileSettingsModal;
