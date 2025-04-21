import { useState, useEffect } from 'react';
import supabase from '../services/supabase.js';
import EmailSettingsForm from '../components/email/EmailSettingsForm.jsx';
import EmailTemplatesManager from '../components/email/EmailTemplatesManager.jsx';
import ServiceSettingsForm from '../components/settings/ServiceSettingsForm.jsx';
import AgeGroupSettings from '../components/settings/AgeGroupSettings.jsx';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [services, setServices] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailSettings();
      fetchEmailTemplates();
    } else if (activeTab === 'services') {
      fetchServices();
    } else if (activeTab === 'age-groups') {
      fetchAgeCategories();
    }
  }, [activeTab]);

  const fetchEmailSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_api_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setEmailConfig(data || null);
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error fetching email templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgeCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('age_categories')
        .select('*')
        .order('min_age');

      if (error) throw error;
      setAgeCategories(data || []);
    } catch (error) {
      console.error('Error fetching age categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailConfigUpdate = async (updatedConfig) => {
    try {
      if (emailConfig) {
        // Update existing config
        const { error } = await supabase
          .from('email_api_config')
          .update(updatedConfig)
          .eq('config_id', emailConfig.config_id);
          
        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from('email_api_config')
          .insert([updatedConfig]);
          
        if (error) throw error;
      }
      
      await fetchEmailSettings();
      return true;
    } catch (error) {
      console.error('Error updating email config:', error);
      return false;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'email':
        return (
          <div className="space-y-10">
            <EmailSettingsForm 
              emailConfig={emailConfig} 
              onUpdate={handleEmailConfigUpdate}
              loading={loading}
            />
            <EmailTemplatesManager 
              templates={emailTemplates} 
              onUpdate={fetchEmailTemplates}
              loading={loading}
            />
          </div>
        );
        
      case 'services':
        return (
          <ServiceSettingsForm 
            services={services} 
            onUpdate={fetchServices}
            loading={loading}
          />
        );
        
      case 'age-groups':
        return (
          <AgeGroupSettings 
            ageCategories={ageCategories} 
            onUpdate={fetchAgeCategories}
            loading={loading}
          />
        );
        
      default:
        return <div>Select a tab to view settings</div>;
    }
  };

  return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 px-6">
            <button
              onClick={() => setActiveTab('services')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'services'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('age-groups')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'age-groups'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Age Groups
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'email'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Email Settings
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {activeTab === 'services' ? 'Service Settings' : 
             activeTab === 'age-groups' ? 'Age Group Settings' : 'Email Settings'}
          </h2>
          
          {loading && activeTab !== 'email' ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            renderTabContent()
          )}
        </div>
      </div>
  );
};

export default SettingsPage;