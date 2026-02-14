import { useState, useEffect } from 'react';
import { Button, Badge, useToast } from '../ui';
import Input from '../ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { sendTestEmail } from '../../services/emailService';

const EmailSettingsForm = ({ emailConfig, onUpdate, loading }) => {
  const { toast } = useToast();
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
  const [openSections, setOpenSections] = useState({
    provider: true,
    sender: false,
    advanced: false,
    test: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
        toast.success('Saved!', {
          description: 'Email settings saved successfully',
          duration: 1500
        });
      } else {
        throw new Error('Error saving settings');
      }
    } catch (error) {
      toast.error('Error', {
        description: error.message || 'Failed to save email settings'
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
      toast.error('Invalid Email', {
        description: 'Please enter a valid email address'
      });
      return;
    }
    
    setIsSendingTest(true);
    
    const loadingToastId = toast.loading('Sending Test Email...', {
      description: `Sending test email to ${testEmail}`
    });
    
    try {
      // Send test email using the current form configuration
      const result = await sendTestEmail(testEmail, formData);
      
      if (result.success) {
        toast.update(loadingToastId, {
          variant: 'success',
          title: 'Test Email Sent!',
          description: `Test email sent successfully to ${testEmail}`,
          duration: 5000
        });
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      toast.update(loadingToastId, {
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Failed to send test email',
        duration: 5000
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
      
      <form className="px-6 py-6 space-y-4" onSubmit={handleSubmit}>
        {/* API Configuration Section - Accordion */}
        <div className="bg-white rounded-lg border border-[#571C1F]/10 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('provider')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h4 className="text-md font-medium text-nextgen-blue-dark flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Provider Settings
            </h4>
            <svg
              className={`h-5 w-5 text-gray-500 transition-transform ${openSections.provider ? 'transform rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <AnimatePresence>
            {openSections.provider && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-4">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sender Information Section - Accordion */}
        <div className="bg-white rounded-lg border border-[#571C1F]/10 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('sender')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h4 className="text-md font-medium text-nextgen-blue-dark flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sender Information
            </h4>
            <svg
              className={`h-5 w-5 text-gray-500 transition-transform ${openSections.sender ? 'transform rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <AnimatePresence>
            {openSections.sender && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-4">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced Settings Section - Accordion */}
        <div className="bg-white rounded-lg border border-[#571C1F]/10 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('advanced')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h4 className="text-md font-medium text-nextgen-blue-dark flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Advanced Settings
            </h4>
            <svg
              className={`h-5 w-5 text-gray-500 transition-transform ${openSections.advanced ? 'transform rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <AnimatePresence>
            {openSections.advanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-4">
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
                    
                    <div className="flex items-start pt-6">
                      <div className="flex items-center h-5">
                        <input
                          id="is_active"
                          name="is_active"
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-nextgen-blue focus:ring-nextgen-blue border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3">
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-900">
                          Enable Email Service
                        </label>
                        <p className="text-xs text-gray-500">Activate email sending functionality</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Test Email Section - Accordion */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-50/50 rounded-lg border border-purple-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('test')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-purple-100/50 transition-colors"
          >
            <h4 className="text-md font-medium text-purple-900 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Email Configuration
            </h4>
            <svg
              className={`h-5 w-5 text-purple-700 transition-transform ${openSections.test ? 'transform rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <AnimatePresence>
            {openSections.test && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 pt-4">
                  <p className="text-sm text-purple-700 mb-4">
                    Send a test email to verify your configuration is working correctly
                  </p>
                  
                  <div className="flex items-end space-x-3">
                    <div className="w-1/2">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
