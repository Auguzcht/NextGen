import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import supabase from '../services/supabase.js';
import EmailSettingsForm from '../components/email/EmailSettingsForm.jsx';
import EmailTemplatesManager from '../components/email/EmailTemplatesManager.jsx';
import EmailComposer from '../components/email/EmailComposer.jsx';
import EmailLogsViewer from '../components/email/EmailLogsViewer.jsx';
import ServiceSettingsManager from '../components/settings/ServiceSettingsForm.jsx';
import ServiceNotesManager from '../components/settings/ServiceNotesManager.jsx';
import AgeGroupSettings from '../components/settings/AgeGroupSettings.jsx';
import MaterialsManager from '../components/settings/MaterialsManager.jsx';
import { Card, Button, Spinner } from '../components/ui';
import { motion } from 'framer-motion';

const SettingsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [services, setServices] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);

  // Initialize the active tab based on URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['services', 'age-groups-materials', 'email'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/settings?tab=${tab}`, { replace: true });
  };

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailSettings();
      fetchEmailTemplates();
    } else if (activeTab === 'services') {
      fetchServices();
    } else if (activeTab === 'age-groups-materials') {
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
        const { error } = await supabase
          .from('email_api_config')
          .update(updatedConfig)
          .eq('config_id', emailConfig.config_id);
          
        if (error) throw error;
      } else {
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
            <EmailComposer 
              templates={emailTemplates}
            />
            <EmailLogsViewer />
          </div>
        );
        
      case 'services':
        return (
          <div className="space-y-10">
            <ServiceSettingsManager 
              services={services} 
              onUpdate={fetchServices}
              loading={loading}
            />
            <ServiceNotesManager 
              services={services}
            />
          </div>
        );
        
      case 'age-groups-materials':
        return (
          <div className="space-y-10">
            <AgeGroupSettings 
              ageCategories={ageCategories} 
              onUpdate={fetchAgeCategories}
              loading={loading}
            />
            <MaterialsManager 
              ageCategories={ageCategories}
            />
          </div>
        );
        
      default:
        return <div>Select a tab to view settings</div>;
    }
  };
  
  const getTabIcon = () => {
    switch (activeTab) {
      case 'services':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'age-groups-materials':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'email':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <Card
        title="Settings"
        titleColor="text-nextgen-blue-dark"
        variant="default"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <div className="border-b border-gray-200 -mt-2">
          <div className="flex space-x-2 md:space-x-6">
            <Button
              variant={activeTab === 'services' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('services')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              iconPosition="left"
            >
              Services
            </Button>
            
            <Button
              variant={activeTab === 'age-groups-materials' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('age-groups-materials')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              iconPosition="left"
            >
              Age Groups & Materials
            </Button>
            
            <Button
              variant={activeTab === 'email' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('email')}
              className="px-4 rounded-b-none rounded-t-lg"
              fullWidth
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              iconPosition="left"
            >
              Email Management
            </Button>
          </div>
        </div>

        <motion.div 
          className="px-1 py-6"
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center mb-6">
            {getTabIcon()}
            <h2 className="text-xl font-semibold text-nextgen-blue-dark ml-2">
              {activeTab === 'services' ? 'Service Settings' : 
               activeTab === 'age-groups-materials' ? 'Age Groups & Materials' : 'Email Management'}
            </h2>
          </div>
          
          {loading && activeTab !== 'email' ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" variant="primary" />
            </div>
          ) : (
            renderTabContent()
          )}
        </motion.div>
      </Card>
    </div>
  );
};

export default SettingsPage;