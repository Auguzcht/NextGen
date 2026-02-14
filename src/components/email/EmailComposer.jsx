import { useState, useEffect, useMemo } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Input, Badge, Modal, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import { createCustomEmailTemplate } from '../../utils/emailTemplates.js';
import { sendBatchEmails } from '../../services/emailService.js';

const EmailComposer = ({ templates }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    template_id: '',
    subject: '',
    body_html: '',
    recipient_type: 'guardians', // guardians, staff, both, individual
    filter_type: 'all', // all, active, age_group, service
    filter_value: '',
    selected_recipients: []
  });
  
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [staff, setStaff] = useState([]);
  const [ageCategories, setAgeCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [showMaterialBrowser, setShowMaterialBrowser] = useState(false);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGuardians, setFilteredGuardians] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [activeContentTab, setActiveContentTab] = useState('editor');
  const [showSendDialog, setShowSendDialog] = useState(false);
  
  // Material browser filters
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('all');
  const [materialSortFilter, setMaterialSortFilter] = useState('recent');

  useEffect(() => {
    fetchMaterials();
    fetchAgeCategories();
    fetchServices();
  }, []);

  useEffect(() => {
    if (formData.recipient_type === 'individual') {
      setShowRecipientSelector(true);
      fetchAllRecipients();
    } else {
      setShowRecipientSelector(false);
      fetchRecipientCount();
    }
  }, [formData.recipient_type, formData.filter_type, formData.filter_value]);

  // Filter recipients based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      setFilteredGuardians(guardians);
      setFilteredStaff(staff);
    } else {
      const filteredG = guardians.filter(guardian => 
        `${guardian.first_name} ${guardian.last_name} ${guardian.email}`
          .toLowerCase()
          .includes(query) ||
        guardian.child_guardian?.some(cg => 
          cg.children.first_name.toLowerCase().includes(query)
        )
      );
      
      const filteredS = staff.filter(member => 
        `${member.first_name} ${member.last_name} ${member.email} ${member.role}`
          .toLowerCase()
          .includes(query)
      );
      
      setFilteredGuardians(filteredG);
      setFilteredStaff(filteredS);
    }
  }, [guardians, staff, searchQuery]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          age_categories (category_name)
        `)
        .eq('is_active', true)
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchAgeCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('age_categories')
        .select('*')
        .order('min_age');

      if (error) throw error;
      setAgeCategories(data || []);
    } catch (error) {
      console.error('Error fetching age categories:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchRecipientCount = async () => {
    try {
      let count = 0;

      if (formData.recipient_type === 'guardians' || formData.recipient_type === 'both') {
        let query = supabase
          .from('guardians')
          .select('guardian_id', { count: 'exact', head: true })
          .not('email', 'is', null);

        if (formData.filter_type === 'active') {
          // Get guardians with active children
          const { data: activeGuardians } = await supabase
            .from('child_guardian')
            .select('guardian_id, children!inner(is_active)')
            .eq('children.is_active', true);
          
          const guardianIds = [...new Set(activeGuardians?.map(g => g.guardian_id) || [])];
          if (guardianIds.length > 0) {
            query = query.in('guardian_id', guardianIds);
          }
        } else if (formData.filter_type === 'age_group' && formData.filter_value) {
          // Get guardians with children in specific age group
          const { data: guardiansByAge } = await supabase
            .from('child_guardian')
            .select('guardian_id, children!inner(age_category_id)')
            .eq('children.age_category_id', parseInt(formData.filter_value));
          
          const guardianIds = [...new Set(guardiansByAge?.map(g => g.guardian_id) || [])];
          if (guardianIds.length > 0) {
            query = query.in('guardian_id', guardianIds);
          }
        }

        const { count: guardianCount } = await query;
        count += guardianCount || 0;
      }

      if (formData.recipient_type === 'staff' || formData.recipient_type === 'both') {
        let query = supabase
          .from('staff')
          .select('staff_id', { count: 'exact', head: true })
          .not('email', 'is', null);

        if (formData.filter_type === 'active') {
          query = query.eq('is_active', true);
        }

        const { count: staffCount } = await query;
        count += staffCount || 0;
      }

      setRecipientCount(count);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
    }
  };

  const fetchAllRecipients = async () => {
    try {
      // Fetch guardians
      const { data: guardiansData, error: guardiansError } = await supabase
        .from('guardians')
        .select(`
          guardian_id,
          first_name,
          last_name,
          email,
          child_guardian (
            children (first_name, last_name)
          )
        `)
        .not('email', 'is', null);

      if (guardiansError) throw guardiansError;

      // Fetch staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('staff_id, first_name, last_name, email, role')
        .not('email', 'is', null)
        .eq('is_active', true);

      if (staffError) throw staffError;

      setGuardians(guardiansData || []);
      setStaff(staffData || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (!templateId) {
      setFormData({
        ...formData,
        template_id: '',
        subject: '',
        body_html: ''
      });
      return;
    }
    
    const template = templates.find(t => t.template_id === parseInt(templateId));
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject || '',
        body_html: template.body_html || template.body || ''
      });
    }
  };

  const toggleMaterial = (material) => {
    setSelectedMaterials(prev => {
      const exists = prev.find(m => m.material_id === material.material_id);
      if (exists) {
        return prev.filter(m => m.material_id !== material.material_id);
      }
      return [...prev, material];
    });
  };

  const toggleRecipient = (recipient, type) => {
    setFormData(prev => {
      const key = type === 'guardian' ? `g_${recipient.guardian_id}` : `s_${recipient.staff_id}`;
      const exists = prev.selected_recipients.find(r => r.key === key);
      
      if (exists) {
        return {
          ...prev,
          selected_recipients: prev.selected_recipients.filter(r => r.key !== key)
        };
      }
      
      return {
        ...prev,
        selected_recipients: [
          ...prev.selected_recipients,
          {
            key,
            type,
            id: type === 'guardian' ? recipient.guardian_id : recipient.staff_id,
            email: recipient.email,
            name: `${recipient.first_name} ${recipient.last_name}`,
            first_name: recipient.first_name,
            last_name: recipient.last_name
          }
        ]
      };
    });
  };

  // Helper function to select/deselect all filtered recipients
  const handleSelectAllFiltered = () => {
    const allFilteredKeys = [
      ...filteredGuardians.map(g => `g_${g.guardian_id}`),
      ...filteredStaff.map(s => `s_${s.staff_id}`)
    ];
    
    const currentSelectedKeys = formData.selected_recipients.map(r => r.key);
    const allSelected = allFilteredKeys.every(key => currentSelectedKeys.includes(key));
    
    if (allSelected) {
      // Deselect all filtered
      setFormData(prev => ({
        ...prev,
        selected_recipients: prev.selected_recipients.filter(r => 
          !allFilteredKeys.includes(r.key)
        )
      }));
    } else {
      // Select all filtered
      const newRecipients = [
        ...filteredGuardians.map(guardian => ({
          key: `g_${guardian.guardian_id}`,
          type: 'guardian',
          id: guardian.guardian_id,
          name: `${guardian.first_name} ${guardian.last_name}`,
          email: guardian.email
        })),
        ...filteredStaff.map(member => ({
          key: `s_${member.staff_id}`,
          type: 'staff',
          id: member.staff_id,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email
        }))
      ];
      
      setFormData(prev => {
        const existingKeys = prev.selected_recipients.map(r => r.key);
        const uniqueNewRecipients = newRecipients.filter(r => !existingKeys.includes(r.key));
        
        return {
          ...prev,
          selected_recipients: [...prev.selected_recipients, ...uniqueNewRecipients]
        };
      });
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!formData.subject || !formData.body_html) {
      toast.error('Missing Information', {
        description: 'Please provide both subject and email body'
      });
      return;
    }

    if (formData.recipient_type === 'individual' && formData.selected_recipients.length === 0) {
      toast.error('No Recipients', {
        description: 'Please select at least one recipient'
      });
      return;
    }

    setShowSendDialog(true);
  };

  const confirmSend = async () => {
    setShowSendDialog(false);
    setIsSending(true);

    const loadingToastId = toast.loading('Sending Emails...', {
      description: 'Preparing and sending emails to recipients'
    });

    try {
      // First, resolve recipients based on the form data
      let recipients = [];

      if (formData.recipient_type === 'individual') {
        // Use selected recipients with proper name handling
        recipients = formData.selected_recipients.map(r => {
          let name = r.name;
          // If name is undefined or contains 'undefined', construct it from first/last name
          if (!name || name.includes('undefined')) {
            name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Valued Member';
          }
          return {
            email: r.email,
            name: name
          };
        });
      } else {
        // Fetch recipients based on filters
        if (formData.recipient_type === 'guardians' || formData.recipient_type === 'both') {
          let guardianQuery = supabase
            .from('guardians')
            .select('guardian_id, first_name, last_name, email')
            .not('email', 'is', null);

          // Apply filters for guardians
          if (formData.filter_type === 'active') {
            const { data: activeGuardians } = await supabase
              .from('child_guardian')
              .select('guardian_id, children!inner(is_active)')
              .eq('children.is_active', true);
            
            const guardianIds = [...new Set(activeGuardians?.map(g => g.guardian_id) || [])];
            if (guardianIds.length > 0) {
              guardianQuery = guardianQuery.in('guardian_id', guardianIds);
            }
          } else if (formData.filter_type === 'age_group' && formData.filter_value) {
            const { data: guardiansByAge } = await supabase
              .from('child_guardian')
              .select('guardian_id, children!inner(age_category_id)')
              .eq('children.age_category_id', parseInt(formData.filter_value));
            
            const guardianIds = [...new Set(guardiansByAge?.map(g => g.guardian_id) || [])];
            if (guardianIds.length > 0) {
              guardianQuery = guardianQuery.in('guardian_id', guardianIds);
            }
          }

          const { data: guardians } = await guardianQuery;
          guardians?.forEach(guardian => {
            recipients.push({
              email: guardian.email,
              name: `${guardian.first_name} ${guardian.last_name}`
            });
          });
        }

        if (formData.recipient_type === 'staff' || formData.recipient_type === 'both') {
          let staffQuery = supabase
            .from('staff')
            .select('staff_id, first_name, last_name, email')
            .not('email', 'is', null);

          if (formData.filter_type === 'active') {
            staffQuery = staffQuery.eq('is_active', true);
          }

          const { data: staff } = await staffQuery;
          staff?.forEach(member => {
            recipients.push({
              email: member.email,
              name: `${member.first_name} ${member.last_name}`
            });
          });
        }
      }

      if (recipients.length === 0) {
        throw new Error('No recipients found matching the specified criteria');
      }

      // For individual recipients, create template with {{name}} placeholder for email provider personalization
      // For group recipients, pre-process with appropriate group greeting
      let emailHtml;
      if (formData.recipient_type === 'individual') {
        emailHtml = createCustomEmailTemplate({
          subject: formData.subject,
          htmlContent: formData.body_html,
          recipientName: '{{name}}', // Placeholder will be replaced per recipient by email provider
          materials: selectedMaterials,
          recipientType: 'individual'
        });
      } else {
        emailHtml = createCustomEmailTemplate({
          subject: formData.subject,
          htmlContent: formData.body_html,
          recipientName: null, // Will be personalized per recipient
          materials: selectedMaterials, // Include selected materials
          recipientType: formData.recipient_type // Pass recipient type for appropriate greeting
        });
      }

      // Format data for the existing send-batch API (which works)
      const emailData = {
        recipients: recipients,
        subject: formData.subject,
        html: emailHtml, // Raw or pre-processed HTML depending on recipient type
        text: null, // Could extract text version if needed
        templateId: formData.template_id || null,
        materialIds: selectedMaterials.map(m => m.material_id), // Include selected materials
        recipientType: formData.recipient_type // Pass recipient type for server-side processing
      };

      // Call the email sending API via service
      const result = await sendBatchEmails(emailData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send emails');
      }

      let description = `Successfully sent: ${result.data.successful || result.data.sent || 0} emails`;
      if ((result.data.failed || 0) > 0) {
        description += `\nFailed: ${result.data.failed} emails`;
      }
      description += `\nTotal recipients: ${result.data.total || recipients.length}`;
      description += `\nSuccess Rate: ${result.data.successRate || '100%'}`;
      
      toast.update(loadingToastId, {
        variant: 'success',
        title: 'Emails Sent!',
        description,
        duration: 5000
      });

      // Reset form
      setFormData({
        template_id: '',
        subject: '',
        body_html: '',
        recipient_type: 'guardians',
        filter_type: 'all',
        filter_value: '',
        selected_recipients: []
      });
      setSelectedMaterials([]);
    } catch (error) {
      toast.update(loadingToastId, {
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send emails',
        duration: 5000
      });
    } finally {
      setIsSending(false);
    }
  };

  // Function to generate preview with always branded template
  const generatePreviewHtml = () => {
    let recipientName = null;
    
    if (formData.recipient_type === 'individual' && formData.selected_recipients.length > 0) {
      if (formData.selected_recipients.length === 1) {
        const recipient = formData.selected_recipients[0];
        
        // Use the name property that was set during selection, or construct from parts
        recipientName = recipient.name;
        if (!recipientName || recipientName.includes('undefined')) {
          recipientName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Sample Recipient';
        }
      } else {
        recipientName = `Multiple Recipients (${formData.selected_recipients.length})`;
      }
    } else if (formData.recipient_type === 'individual') {
      recipientName = 'Sample Recipient';
    }
    
    return createCustomEmailTemplate({
      subject: formData.subject || 'Email Subject',
      htmlContent: formData.body_html || '<p>Start typing your content to see the preview...</p>',
      recipientName,
      materials: selectedMaterials,
      recipientType: formData.recipient_type || 'guardians'
    });
  };

  // Filter and sort materials for browser
  const filteredBrowseMaterials = useMemo(() => {
    let filtered = materials.filter(material => {
      // Search filter
      const searchLower = materialSearchQuery.toLowerCase();
      const matchesSearch = !materialSearchQuery || 
        material.title.toLowerCase().includes(searchLower) ||
        material.description?.toLowerCase().includes(searchLower);
      
      // Category filter
      const matchesCategory = materialCategoryFilter === 'all' || 
        material.category === materialCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });
    
    // Sort materials
    if (materialSortFilter === 'recent') {
      filtered.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
    } else if (materialSortFilter === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (materialSortFilter === 'category') {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    }
    
    return filtered;
  }, [materials, materialSearchQuery, materialCategoryFilter, materialSortFilter]);
  
  // Get unique categories from materials
  const materialCategories = useMemo(() => {
    const uniqueCategories = [...new Set(materials.map(m => m.category))];
    return uniqueCategories.sort();
  }, [materials]);

  const getMaterialIcon = (category) => {
    const icons = {
      'Lesson': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      'Activity': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'Song': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      'Craft': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      'Video': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      'Story': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      'Game': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      )
    };
    return icons[category] || icons['Lesson'];
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Email Composer</h3>
            <p className="mt-1 text-sm text-gray-500">
              Send emails to guardians, staff, or both with optional material attachments
            </p>
          </div>
          {recipientCount > 0 && formData.recipient_type !== 'individual' && (
            <Badge variant="info" size="xxs">
              {recipientCount} Recipients
            </Badge>
          )}
          {formData.recipient_type === 'individual' && formData.selected_recipients.length > 0 && (
            <Badge variant="success" size="xxs">
              {formData.selected_recipients.length} Selected
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="px-6 py-6">
        <div className="space-y-6">
          {/* Template Selection */}
          <motion.div 
            className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-md font-medium text-nextgen-blue-dark mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Template (Optional)
            </h4>
            
            <Input
              type="select"
              name="template_id"
              value={formData.template_id}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              options={[
                { value: '', label: '-- Start from scratch --' },
                ...templates.filter(t => t.is_active).map((template) => ({
                  value: template.template_id.toString(),
                  label: template.template_name
                }))
              ]}
            />
          </motion.div>

          {/* Recipient Selection */}
          <motion.div 
            className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h4 className="text-md font-medium text-nextgen-blue-dark mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Recipients
            </h4>
            
            <div className="space-y-4">
              <Input
                type="select"
                label="Recipient Type *"
                name="recipient_type"
                value={formData.recipient_type}
                onChange={(e) => setFormData({...formData, recipient_type: e.target.value, selected_recipients: []})}
                options={[
                  { value: 'guardians', label: 'Guardians (Parents)' },
                  { value: 'staff', label: 'Staff Members' },
                  { value: 'both', label: 'Both Guardians & Staff' },
                  { value: 'individual', label: 'Select Individual Recipients' }
                ]}
                required
              />

              {formData.recipient_type !== 'individual' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="select"
                    label="Filter By"
                    name="filter_type"
                    value={formData.filter_type}
                    onChange={(e) => setFormData({...formData, filter_type: e.target.value, filter_value: ''})}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'active', label: 'Active Only' },
                      ...(formData.recipient_type === 'guardians' ? [
                        { value: 'age_group', label: 'Age Group' },
                        { value: 'service', label: 'Service' }
                      ] : [])
                    ]}
                  />

                  {formData.filter_type === 'age_group' && (
                    <Input
                      type="select"
                      label="Age Category"
                      name="filter_value"
                      value={formData.filter_value}
                      onChange={(e) => setFormData({...formData, filter_value: e.target.value})}
                      options={[
                        { value: '', label: 'Select Category' },
                        ...ageCategories.map((cat) => ({
                          value: cat.category_id.toString(),
                          label: cat.category_name
                        }))
                      ]}
                    />
                  )}

                  {formData.filter_type === 'service' && (
                    <Input
                      type="select"
                      label="Service"
                      name="filter_value"
                      value={formData.filter_value}
                      onChange={(e) => setFormData({...formData, filter_value: e.target.value})}
                      options={[
                        { value: '', label: 'Select Service' },
                        ...services.map((service) => ({
                          value: service.service_id.toString(),
                          label: service.service_name
                        }))
                      ]}
                    />
                  )}
                </div>
              )}

              {/* Individual Recipient Selector */}
              {formData.recipient_type === 'individual' && (
                <div className="mt-4 border border-gray-200 rounded-lg p-4">
                  {/* Search and Actions Header */}
                  <div className="flex items-end gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Search by name, email, or children's names..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        startIcon={
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        }
                        size="md"
                      />
                    </div>
                    <div className="flex-shrink-0 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={handleSelectAllFiltered}
                        className="whitespace-nowrap h-[42px]"
                      >
                        {(() => {
                          const allFilteredKeys = [
                            ...filteredGuardians.map(g => `g_${g.guardian_id}`),
                            ...filteredStaff.map(s => `s_${s.staff_id}`)
                          ];
                          const currentSelectedKeys = formData.selected_recipients.map(r => r.key);
                          const allSelected = allFilteredKeys.length > 0 && allFilteredKeys.every(key => currentSelectedKeys.includes(key));
                          return allSelected ? 'Deselect All' : 'Select All';
                        })()} 
                        ({filteredGuardians.length + filteredStaff.length})
                      </Button>
                    </div>
                  </div>

                  {/* Results Summary */}
                  {searchQuery && (
                    <div className="mb-3 text-sm text-gray-600">
                      Found {filteredGuardians.length + filteredStaff.length} recipients
                      {searchQuery && ` matching "${searchQuery}"`}
                    </div>
                  )}

                  {/* Recipients List */}
                  <div className="max-h-80 overflow-y-auto space-y-4">
                    {/* Guardians Section */}
                    {filteredGuardians.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 flex items-center">
                            <svg className="h-4 w-4 mr-1.5 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            Guardians ({filteredGuardians.length})
                          </h5>
                          <Badge variant="info" size="xxs">
                            {formData.selected_recipients.filter(r => r.type === 'guardian').length} selected
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {filteredGuardians.map((guardian) => (
                            <label
                              key={guardian.guardian_id}
                              className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={formData.selected_recipients.some(r => r.key === `g_${guardian.guardian_id}`)}
                                onChange={() => toggleRecipient(guardian, 'guardian')}
                                className="h-4 w-4 text-nextgen-blue focus:ring-nextgen-blue border-gray-300 rounded"
                              />
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {guardian.first_name} {guardian.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{guardian.email}</p>
                                {guardian.child_guardian?.length > 0 && (
                                  <div className="flex items-center mt-1">
                                    <svg className="h-3 w-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <p className="text-xs text-gray-400">
                                      Children: {guardian.child_guardian.map(cg => cg.children.first_name).join(', ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Staff Section */}
                    {filteredStaff.length > 0 && (
                      <div className={filteredGuardians.length > 0 ? "pt-4 border-t border-gray-200" : ""}>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 flex items-center">
                            <svg className="h-4 w-4 mr-1.5 text-nextgen-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Staff ({filteredStaff.length})
                          </h5>
                          <Badge variant="success" size="xxs">
                            {formData.selected_recipients.filter(r => r.type === 'staff').length} selected
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {filteredStaff.map((member) => (
                            <label
                              key={member.staff_id}
                              className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={formData.selected_recipients.some(r => r.key === `s_${member.staff_id}`)}
                                onChange={() => toggleRecipient(member, 'staff')}
                                className="h-4 w-4 text-nextgen-blue focus:ring-nextgen-blue border-gray-300 rounded"
                              />
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                                <Badge variant="secondary" size="xxs" className="mt-1 inline-block">
                                  {member.role}
                                </Badge>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {filteredGuardians.length === 0 && filteredStaff.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {searchQuery ? (
                          <div>
                            <p className="font-medium">No recipients found</p>
                            <p className="text-sm mt-1">Try adjusting your search terms</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">No recipients available</p>
                            <p className="text-sm mt-1">Add guardians or staff members to send emails</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Email Content */}
          <motion.div 
            className="bg-white rounded-lg border border-[#571C1F]/10 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-md font-medium text-nextgen-blue-dark mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Content
              </h4>
              
              <Input
                label="Subject *"
                name="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Enter email subject"
                required
              />
            </div>

            {/* Content Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  type="button"
                  onClick={() => setActiveContentTab('editor')}
                  className={`${
                    activeContentTab === 'editor'
                      ? 'border-nextgen-blue text-nextgen-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Content Editor
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveContentTab('preview')}
                  className={`${
                    activeContentTab === 'preview'
                      ? 'border-nextgen-blue text-nextgen-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Live Preview
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeContentTab === 'editor' ? (
                <Input
                  type="textarea"
                  label="Email Body (HTML) *"
                  name="body_html"
                  value={formData.body_html}
                  onChange={(e) => setFormData({...formData, body_html: e.target.value})}
                  rows={12}
                  placeholder="<p>Your email content here...</p>"
                  helperText="Use HTML tags for formatting. Materials will be automatically added if selected below."
                  required
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-700">Email Preview</h5>
                    <div className="text-xs text-gray-500">
                      {selectedMaterials.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          📎 {selectedMaterials.length} material{selectedMaterials.length > 1 ? 's' : ''} will be attached
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto" style={{ height: '500px' }}>
                    {formData.subject || formData.body_html ? (
                      <div 
                        className="p-4 email-preview-content"
                        dangerouslySetInnerHTML={{ 
                          __html: generatePreviewHtml()
                        }}
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.5',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <p className="text-sm font-medium text-gray-600 mb-1">No Content Yet</p>
                          <p className="text-xs text-gray-500">Add a subject and content to see your email preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <svg className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-blue-800 mb-1">Preview Notes:</p>
                        <ul className="text-blue-700 space-y-1">
                          <li>• This preview shows how your email will appear with NXTGen Ministry branding</li>
                          <li>• Selected materials will automatically be added as a resources section</li>
                          <li>• Recipient names will be personalized when emails are sent</li>
                          <li>• Use the Content Editor tab to make changes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Material Attachments */}
          <motion.div 
            className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-nextgen-blue-dark flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Material Attachments ({selectedMaterials.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMaterialBrowser(!showMaterialBrowser)}
              >
                {showMaterialBrowser ? 'Hide' : 'Browse'} Materials
              </Button>
            </div>

            {/* Selected Materials */}
            {selectedMaterials.length > 0 && (
              <div className="mb-4 space-y-2">
                {selectedMaterials.map((material) => (
                  <div
                    key={material.material_id}
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-nextgen-blue to-nextgen-teal flex items-center justify-center text-white">
                        {getMaterialIcon(material.category)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{material.title}</p>
                        <p className="text-xs text-gray-500">{material.category}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMaterial(material)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Material Browser */}
            <AnimatePresence>
              {showMaterialBrowser && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  {/* Material Browser Filters */}
                  <div className="flex flex-col sm:flex-row gap-2 pb-3 border-b border-gray-200">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Search materials..."
                        value={materialSearchQuery}
                        onChange={(e) => setMaterialSearchQuery(e.target.value)}
                        startIcon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        }
                        fullWidth
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="select"
                        value={materialCategoryFilter}
                        onChange={(e) => setMaterialCategoryFilter(e.target.value)}
                        options={[
                          { value: 'all', label: 'All Types' },
                          ...materialCategories.map(cat => ({ value: cat, label: cat }))
                        ]}
                        className="w-30"
                      />
                      <Input
                        type="select"
                        value={materialSortFilter}
                        onChange={(e) => setMaterialSortFilter(e.target.value)}
                        options={[
                          { value: 'recent', label: 'Recent' },
                          { value: 'title', label: 'Title A-Z' },
                          { value: 'category', label: 'Category' }
                        ]}
                        className="w-30"
                      />
                    </div>
                  </div>
                  
                  {/* Materials List */}
                  <div className="max-h-80 overflow-y-auto">
                    {filteredBrowseMaterials.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {materialSearchQuery || materialCategoryFilter !== 'all' 
                          ? 'No materials match your filters' 
                          : 'No materials available'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredBrowseMaterials.map((material) => (
                        <label
                          key={material.material_id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMaterials.some(m => m.material_id === material.material_id)}
                            onChange={() => toggleMaterial(material)}
                            className="h-4 w-4 text-nextgen-blue focus:ring-nextgen-blue border-gray-300 rounded"
                          />
                          <div className="ml-3 flex items-center space-x-3 flex-1">
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-nextgen-blue to-nextgen-teal flex items-center justify-center text-white">
                              {getMaterialIcon(material.category)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{material.title}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="primary" size="xxs">{material.category}</Badge>
                                {material.age_categories && (
                                  <Badge variant="info" size="xxs">{material.age_categories.category_name}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-5 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  template_id: '',
                  subject: '',
                  body_html: '',
                  recipient_type: 'guardians',
                  filter_type: 'all',
                  filter_value: '',
                  selected_recipients: []
                });
                setSelectedMaterials([]);
              }}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Send Emails'}
            </Button>
          </div>
        </div>
      </form>

      {/* Send Confirmation Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>
              <div className="space-y-2 text-left">
                <p><strong>Subject:</strong> {formData.subject}</p>
                <p><strong>Recipients:</strong> {formData.recipient_type === 'individual' ? formData.selected_recipients.length : recipientCount}</p>
                <p><strong>Attachments:</strong> {selectedMaterials.length}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmSend}
            >
              Yes, send emails
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailComposer;
