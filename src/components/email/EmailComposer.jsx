import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Input, Badge } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const EmailComposer = ({ templates }) => {
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
      return;
    }
    
    const template = templates.find(t => t.template_id === parseInt(templateId));
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject,
        body_html: template.body || template.body_html || ''
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
            name: `${recipient.first_name} ${recipient.last_name}`
          }
        ]
      };
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!formData.subject || !formData.body_html) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Information',
        text: 'Please provide both subject and email body'
      });
      return;
    }

    if (formData.recipient_type === 'individual' && formData.selected_recipients.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'No Recipients',
        text: 'Please select at least one recipient'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Send',
      html: `
        <div class="text-left">
          <p><strong>Subject:</strong> ${formData.subject}</p>
          <p><strong>Recipients:</strong> ${formData.recipient_type === 'individual' ? formData.selected_recipients.length : recipientCount}</p>
          <p><strong>Attachments:</strong> ${selectedMaterials.length}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, send emails',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setIsSending(true);

    try {
      // Prepare email data
      const emailData = {
        template_id: formData.template_id || null,
        subject: formData.subject,
        body_html: formData.body_html,
        recipient_type: formData.recipient_type,
        filter_type: formData.filter_type,
        filter_value: formData.filter_value,
        selected_recipients: formData.selected_recipients,
        material_ids: selectedMaterials.map(m => m.material_id),
        attachment_urls: selectedMaterials.map(m => m.file_url),
        status: 'pending'
      };

      // TODO: Call your email sending API/function here
      // This would typically call a backend endpoint that:
      // 1. Gets recipients based on filters
      // 2. Creates email_logs entries
      // 3. Sends emails in batches via Resend
      
      console.log('Email data to send:', emailData);

      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 2000));

      Swal.fire({
        icon: 'success',
        title: 'Emails Queued!',
        text: `Successfully queued emails for ${formData.recipient_type === 'individual' ? formData.selected_recipients.length : recipientCount} recipients`,
        timer: 2000
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
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to send emails'
      });
    } finally {
      setIsSending(false);
    }
  };

  const getMaterialIcon = (category) => {
    const icons = {
      'Lesson': '📖',
      'Activity': '🎮',
      'Song': '🎵',
      'Craft': '✂️',
      'Video': '🎥',
      'Story': '📚',
      'Game': '🎯'
    };
    return icons[category] || '📄';
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
            <Badge variant="info" size="sm">
              {recipientCount} Recipients
            </Badge>
          )}
          {formData.recipient_type === 'individual' && formData.selected_recipients.length > 0 && (
            <Badge variant="success" size="sm">
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
                <div className="mt-4 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-4">
                    {/* Guardians Section */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Guardians ({guardians.length})</h5>
                      <div className="space-y-2">
                        {guardians.map((guardian) => (
                          <label
                            key={guardian.guardian_id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                                <p className="text-xs text-gray-400">
                                  Children: {guardian.child_guardian.map(cg => `${cg.children.first_name}`).join(', ')}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Staff Section */}
                    <div className="pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">Staff ({staff.length})</h5>
                      <div className="space-y-2">
                        {staff.map((member) => (
                          <label
                            key={member.staff_id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                              <Badge variant="secondary" size="xs" className="mt-1">
                                {member.role}
                              </Badge>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Email Content */}
          <motion.div 
            className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h4 className="text-md font-medium text-nextgen-blue-dark mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Content
            </h4>
            
            <div className="space-y-4">
              <Input
                label="Subject *"
                name="subject"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                placeholder="Enter email subject"
                required
              />

              <Input
                type="textarea"
                label="Email Body (HTML) *"
                name="body_html"
                value={formData.body_html}
                onChange={(e) => setFormData({...formData, body_html: e.target.value})}
                rows={12}
                placeholder="<p>Your email content here...</p>"
                helperText="Use HTML tags for formatting"
                required
              />
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
                      <span className="text-2xl">{getMaterialIcon(material.category)}</span>
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
                  className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto"
                >
                  {materials.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No materials available</p>
                  ) : (
                    <div className="space-y-2">
                      {materials.map((material) => (
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
                            <span className="text-xl">{getMaterialIcon(material.category)}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{material.title}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="primary" size="xs">{material.category}</Badge>
                                {material.age_categories && (
                                  <Badge variant="info" size="xs">{material.age_categories.category_name}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
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
    </div>
  );
};

export default EmailComposer;
