import { useState, useEffect } from 'react';
import { Button, Badge } from '../ui';
import Input from '../ui/Input';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import { sendTestEmail } from '../../services/emailService';

const EmailSettingsForm = ({ emailConfig, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    provider: 'Resend',
    api_key: '',
    from_email: '',
    from_name: 'NextGen Ministry',
    batch_size: 100,
    is_active: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (emailConfig) {
      setFormData(emailConfig);
    }
  }, [emailConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const success = await onUpdate(formData);
      if (success) {
        Swal.fire({
          icon: 'success',
          title: 'Saved!',
          text: 'Email settings saved successfully',
          timer: 1500
        });
      } else {
        throw new Error('Error saving settings');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save email settings'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    });
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();
    
    if (!testEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address'
      });
      return;
    }
    
    setIsSendingTest(true);
    
    try {
      // Send test email using the current form configuration
      const result = await sendTestEmail(testEmail, formData);
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Test Email Sent!',
          text: `Test email sent successfully to ${testEmail}`,
          timer: 2000
        });
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error || error.message || 'Failed to send test email'
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Email API Configuration</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure your email service provider for sending notifications and reports
            </p>
          </div>
          {emailConfig?.is_active && (
            <Badge variant="success" size="sm">
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mx-6 mt-6 rounded-r-md backdrop-blur-sm shadow-sm">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-nextgen-blue-dark font-medium">
              Email Configuration Purpose
            </p>
            <ul className="mt-2 text-xs text-gray-600 list-disc list-inside space-y-1">
              <li><strong>Weekly Reports:</strong> Automatically send attendance reports to guardians</li>
              <li><strong>Manual Emails:</strong> Send custom messages to guardians via Email Composer</li>
              <li><strong>Notifications:</strong> Event reminders, birthday messages, and announcements</li>
            </ul>
          </div>
        </div>
      </div>
      
      <form className="px-6 py-6 space-y-6" onSubmit={handleSubmit}>
        {/* API Configuration Section */}
        <motion.div 
          className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="text-md font-medium text-nextgen-blue-dark mb-4">Provider Settings</h4>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="select"
              id="provider"
              name="provider"
              label="Email Provider"
              value={formData.provider}
              onChange={handleInputChange}
              options={[
                { value: 'Resend', label: 'Resend' },
                { value: 'SendGrid', label: 'SendGrid' },
                { value: 'Mailgun', label: 'Mailgun' },
                { value: 'AWS SES', label: 'AWS SES' },
                { value: 'SMTP', label: 'Custom SMTP' }
              ]}
              helperText="Choose your email service provider"
              required
              animate
            />
            
            <Input
              type="password"
              id="api_key"
              name="api_key"
              label="API Key"
              value={formData.api_key}
              onChange={handleInputChange}
              placeholder="Enter your API key"
              helperText="Your provider's API authentication key"
              required
              animate
            />
          </div>
        </motion.div>

        {/* Sender Information Section */}
        <motion.div 
          className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <h4 className="text-md font-medium text-nextgen-blue-dark mb-4">Sender Information</h4>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="email"
              id="from_email"
              name="from_email"
              label="From Email Address"
              value={formData.from_email}
              onChange={handleInputChange}
              placeholder="noreply@yourchurch.org"
              helperText="Must be verified with your email provider"
              required
              animate
            />
            
            <Input
              type="text"
              id="from_name"
              name="from_name"
              label="From Name"
              value={formData.from_name}
              onChange={handleInputChange}
              placeholder="NextGen Ministry"
              helperText="Display name for outgoing emails"
              required
              animate
            />
          </div>
        </motion.div>

        {/* Advanced Settings Section */}
        <motion.div 
          className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h4 className="text-md font-medium text-nextgen-blue-dark mb-4">Advanced Settings</h4>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="number"
              id="batch_size"
              name="batch_size"
              label="Batch Size"
              min="1"
              max="1000"
              value={formData.batch_size}
              onChange={handleInputChange}
              helperText="Maximum emails to send in a single batch (1-1000)"
              required
              animate
            />
            
            <div className="flex items-center h-full pt-5">
              <div className="flex items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-nextgen-blue focus:ring-nextgen-blue border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 font-medium">
                  Enable Email Service
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Test Email Section */}
        <motion.div 
          className="bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-lg border border-purple-200 p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h4 className="text-md font-medium text-purple-900 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Test Email Configuration
          </h4>
          <p className="text-sm text-purple-700 mb-4">
            Send a test email to verify your configuration is working correctly
          </p>
          
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <Input
                type="email"
                id="test_email"
                label="Test Email Address"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="mb-0"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEmail}
              disabled={isSendingTest || !formData.api_key || !formData.from_email}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {isSendingTest ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </motion.div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (emailConfig) {
                setFormData(emailConfig);
              }
            }}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmailSettingsForm;
