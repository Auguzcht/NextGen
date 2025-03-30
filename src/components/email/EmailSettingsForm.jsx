import { useState, useEffect } from 'react';

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
  const [testResult, setTestResult] = useState(null);

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
        setTestResult({ success: true, message: 'Email settings saved successfully' });
      } else {
        throw new Error('Error saving settings');
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
      
      // Auto-clear success message after 5 seconds
      if (testResult?.success) {
        setTimeout(() => setTestResult(null), 5000);
      }
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
      setTestResult({ success: false, message: 'Please enter a valid email address' });
      return;
    }
    
    setIsSendingTest(true);
    setTestResult(null);
    
    try {
      // Here we would call an endpoint to send a test email
      // For now, let's just simulate it
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTestResult({ success: true, message: `Test email sent to ${testEmail}` });
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Email API Configuration</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure the email service for sending notifications to guardians and staff.
        </p>
      </div>
      
      {testResult && (
        <div className={`mx-6 mb-4 p-4 rounded-md ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {testResult.message}
        </div>
      )}
      
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            <div>
              <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                Email Provider
              </label>
              <select
                id="provider"
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                <option value="Resend">Resend</option>
                <option value="SendGrid">SendGrid</option>
                <option value="Mailgun">Mailgun</option>
                <option value="SMTP">SMTP</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="api_key" className="block text-sm font-medium text-gray-700">
                API Key
              </label>
              <input
                type="password"
                id="api_key"
                name="api_key"
                value={formData.api_key}
                onChange={handleInputChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="from_email" className="block text-sm font-medium text-gray-700">
                From Email
              </label>
              <input
                type="email"
                id="from_email"
                name="from_email"
                value={formData.from_email}
                onChange={handleInputChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="from_name" className="block text-sm font-medium text-gray-700">
                From Name
              </label>
              <input
                type="text"
                id="from_name"
                name="from_name"
                value={formData.from_name}
                onChange={handleInputChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="batch_size" className="block text-sm font-medium text-gray-700">
                Batch Size
              </label>
              <input
                type="number"
                id="batch_size"
                name="batch_size"
                min="1"
                max="1000"
                value={formData.batch_size}
                onChange={handleInputChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Max number of emails to send in a single batch</p>
            </div>
            
            <div className="flex items-center h-full pt-5">
              <div className="flex items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-5 border-t border-gray-200">
            <div>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <input
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isSendingTest || !formData.api_key || !formData.from_email}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailSettingsForm;