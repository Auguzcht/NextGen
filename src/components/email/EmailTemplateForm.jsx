import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Input, Button } from '../ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { createPortal } from 'react-dom';

const EmailTemplateForm = ({ onClose, onSuccess, isEdit = false, initialData = null }) => {
  const [formData, setFormData] = useState(() => {
    if (isEdit && initialData) {
      return {
        template_name: initialData.template_name || '',
        subject: initialData.subject || '',
        body_html: initialData.body_html || initialData.body || '',
        body_text: initialData.body_text || '',
        template_type: initialData.template_type || 'notification',
        is_active: initialData.is_active ?? true
      };
    }
    
    return {
      template_name: '',
      subject: '',
      body_html: '',
      body_text: '',
      template_type: 'notification',
      is_active: true
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Control body overflow
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.template_name.trim()) {
      newErrors.template_name = 'Template name is required';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.body_html.trim() && !formData.body_text.trim()) {
      newErrors.body_html = 'Email content is required (HTML or plain text)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    const hasData = formData.template_name || formData.subject || formData.body_html || formData.body_text;
    
    if (hasData && !isEdit) {
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
      if (isEdit && initialData?.template_id) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            template_name: formData.template_name.trim(),
            subject: formData.subject.trim(),
            body_html: formData.body_html.trim(),
            body_text: formData.body_text.trim(),
            template_type: formData.template_type,
            is_active: formData.is_active,
            last_modified: new Date().toISOString()
          })
          .eq('template_id', initialData.template_id);
        
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Template has been updated successfully.',
          timer: 1500
        });
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert([{
            template_name: formData.template_name.trim(),
            subject: formData.subject.trim(),
            body_html: formData.body_html.trim(),
            body_text: formData.body_text.trim(),
            template_type: formData.template_type,
            is_active: formData.is_active,
            last_modified: new Date().toISOString()
          }]);
        
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Added!',
          text: 'Template has been added successfully.',
          timer: 1500
        });
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save template'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const templateTypeOptions = [
    { value: 'notification', label: 'Notification' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'report', label: 'Report' },
    { value: 'announcement', label: 'Announcement' }
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {isEdit ? 'Edit Email Template' : 'Add New Email Template'}
          </h2>
          <button 
            type="button"
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
                    ? 'Update template content and settings'
                    : 'Create a reusable email template for guardians and staff'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Template Information Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Template Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Template Name"
                    name="template_name"
                    value={formData.template_name}
                    onChange={handleInputChange}
                    error={errors.template_name}
                    placeholder="e.g., Weekly Report"
                    required
                    animate
                  />
                  
                  <Input
                    type="select"
                    label="Template Type"
                    name="template_type"
                    value={formData.template_type}
                    onChange={handleInputChange}
                    options={templateTypeOptions}
                    required
                    animate
                  />
                </div>

                <div className="mt-4">
                  <Input
                    label="Subject Line"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    error={errors.subject}
                    placeholder="Email subject"
                    required
                    animate
                  />
                </div>

                <div className="mt-4 flex items-start">
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
                    <label htmlFor="is_active" className="font-medium text-gray-700">Active Template</label>
                    <p className="text-gray-500">Inactive templates won't appear in the composer dropdown.</p>
                  </div>
                </div>
              </motion.div>

              {/* Email Content Section */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                  Email Content
                </h3>
                
                <Input
                  type="textarea"
                  label="HTML Content"
                  name="body_html"
                  rows={10}
                  value={formData.body_html}
                  onChange={handleInputChange}
                  error={errors.body_html}
                  placeholder="<h1>Your HTML content here...</h1>"
                  helperText="Use HTML tags for formatting. Variables: {child_name}, {guardian_name}"
                  className="font-mono"
                  required
                  animate
                />

                <Input
                  type="textarea"
                  label="Plain Text Content (Optional)"
                  name="body_text"
                  rows={6}
                  value={formData.body_text}
                  onChange={handleInputChange}
                  placeholder="Plain text version of your email..."
                  helperText="Fallback for email clients that don't support HTML"
                  animate
                />
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
              isLoading={isSaving}
            >
              {isEdit ? 'Save Changes' : 'Add Template'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EmailTemplateForm;

