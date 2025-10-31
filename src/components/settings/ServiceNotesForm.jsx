import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import supabase from '../../services/supabase.js';
import { Button, Badge, Input } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { formatDate } from '../../utils/dateUtils.js';

const ServiceNotesForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    theme: '',
    lesson_summary: '',
    special_activities: '',
    issues_encountered: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [existingNoteId, setExistingNoteId] = useState(null);
  const [pastServices, setPastServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [showServiceList, setShowServiceList] = useState(true);

  useEffect(() => {
    fetchPastServices();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const fetchPastServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          attendance_date,
          service_id,
          services (service_name, day_of_week)
        `)
        .order('attendance_date', { ascending: false });

      if (error) throw error;

      const uniqueServices = [];
      const seen = new Set();

      data?.forEach(record => {
        const key = `${record.service_id}-${record.attendance_date}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueServices.push({
            service_id: record.service_id,
            service_date: record.attendance_date,
            service_name: record.services?.service_name,
            day_of_week: record.services?.day_of_week
          });
        }
      });

      const servicesWithNotes = await Promise.all(
        uniqueServices.map(async (service) => {
          const { data: noteData } = await supabase
            .from('service_notes')
            .select('note_id')
            .eq('service_id', service.service_id)
            .eq('service_date', service.service_date)
            .maybeSingle();

          return {
            ...service,
            hasNote: !!noteData
          };
        })
      );

      setPastServices(servicesWithNotes);
    } catch (error) {
      console.error('Error fetching past services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectService = async (service) => {
    setSelectedService(service);
    setShowServiceList(false);
    await fetchExistingNotes(service.service_id, service.service_date);
  };

  const fetchExistingNotes = async (serviceId, serviceDate) => {
    try {
      const { data, error } = await supabase
        .from('service_notes')
        .select('*')
        .eq('service_id', serviceId)
        .eq('service_date', serviceDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFormData({
          theme: data.theme || '',
          lesson_summary: data.lesson_summary || '',
          special_activities: data.special_activities || '',
          issues_encountered: data.issues_encountered || ''
        });
        setExistingNoteId(data.note_id);
      }
    } catch (error) {
      console.error('Error fetching service notes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBack = () => {
    setSelectedService(null);
    setShowServiceList(true);
    setFormData({
      theme: '',
      lesson_summary: '',
      special_activities: '',
      issues_encountered: ''
    });
    setExistingNoteId(null);
  };

  const handleClose = () => {
    // If on the form view (not service list), check for unsaved changes
    if (!showServiceList) {
      const hasData = formData.theme.trim() !== '' || 
                     formData.lesson_summary.trim() !== '' ||
                     formData.special_activities.trim() !== '' ||
                     formData.issues_encountered.trim() !== '';
      
      // Only prompt if there's data AND it's not an existing note
      if (hasData && !existingNoteId) {
        Swal.fire({
          title: 'Discard Changes?',
          text: 'Any unsaved changes will be lost.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, discard',
          cancelButtonText: 'No, keep editing'
        }).then((result) => {
          if (result.isConfirmed) {
            onClose();
          }
        });
        return; // Don't close yet - wait for user response
      }
    }
    
    // Close directly if:
    // 1. On service list view
    // 2. No unsaved data
    // 3. Editing existing note
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      // Fetch the staff_id using the user_id (UUID)
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('staff_id')
        .eq('user_id', userId)
        .single();
      
      if (staffError) {
        console.error('Error fetching staff data:', staffError);
        throw new Error('Unable to identify staff member');
      }
      
      const staffId = staffData?.staff_id;
      
      if (existingNoteId) {
        const { error } = await supabase
          .from('service_notes')
          .update({
            ...formData,
            recorded_by: staffId  // Use staff_id instead of user UUID
          })
          .eq('note_id', existingNoteId);
        
        if (error) throw error;
        
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Service notes have been updated successfully.',
          timer: 1500
        });
      } else {
        const { error } = await supabase
          .from('service_notes')
          .insert([{
            ...formData,
            service_id: selectedService.service_id,
            service_date: selectedService.service_date,
            recorded_by: staffId  // Use staff_id instead of user UUID
          }]);
        
        if (error) throw error;
        
        Swal.fire({
          icon: 'success',
          title: 'Added!',
          text: 'Service notes have been added successfully.',
          timer: 1500
        });
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving service notes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save service notes'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <motion.div 
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {showServiceList ? 'Select Service for Notes' : `Service Notes${existingNoteId ? ' - Edit' : ' - Add'}`}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            type="button"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showServiceList ? (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-6 rounded-r-md backdrop-blur-sm shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-nextgen-blue-dark font-medium">
                      Select a service that has occurred with attendance to add or edit notes
                    </p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
                </div>
              ) : pastServices.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500">No services with attendance found.</p>
                  <p className="text-sm text-gray-400 mt-1">Services will appear here after children are checked in.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastServices.filter(s => !s.hasNote).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Services Without Notes ({pastServices.filter(s => !s.hasNote).length})
                      </h4>
                      <div className="space-y-2">
                        {pastServices.filter(s => !s.hasNote).map((service, idx) => (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectService(service)}
                            className="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-200 transition-all text-left hover:shadow-md"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{service.service_name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(service.service_date, { month: 'long', day: 'numeric', year: 'numeric' })} • {service.day_of_week}
                              </p>
                            </div>
                            <Badge variant="warning" size="sm">No Notes</Badge>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {pastServices.filter(s => s.hasNote).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Services With Notes ({pastServices.filter(s => s.hasNote).length})
                      </h4>
                      <div className="space-y-2">
                        {pastServices.filter(s => s.hasNote).map((service, idx) => (
                          <motion.button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectService(service)}
                            className="w-full flex items-center justify-between bg-white hover:bg-gray-50 p-4 rounded-lg border border-gray-200 transition-all text-left hover:shadow-md"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{service.service_name}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(service.service_date, { month: 'long', day: 'numeric', year: 'numeric' })} • {service.day_of_week}
                              </p>
                            </div>
                            <Badge variant="success" size="sm">Has Notes</Badge>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-6 rounded-r-md backdrop-blur-sm shadow-sm">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-nextgen-blue-dark font-medium">
                      {existingNoteId 
                        ? 'Update service notes and documentation'
                        : 'Add notes and documentation for this service'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div 
                  className="bg-gradient-to-br from-nextgen-blue/5 to-nextgen-blue/10 p-4 rounded-lg border border-nextgen-blue/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-nextgen-blue-dark">
                        {selectedService?.service_name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(selectedService?.service_date, { month: 'long', day: 'numeric', year: 'numeric' })} • {selectedService?.day_of_week}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleBack}
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                      }
                    >
                      Change Service
                    </Button>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                    Service Theme
                  </h3>
                  <Input
                    label="Theme/Topic"
                    name="theme"
                    value={formData.theme}
                    onChange={handleInputChange}
                    placeholder="Main theme or topic of the service"
                  />
                </motion.div>

                <motion.div 
                  className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                    Lesson & Activities
                  </h3>
                  <div className="space-y-4">
                    <Input
                      type="textarea"
                      label="Lesson Summary"
                      name="lesson_summary"
                      rows={3}
                      value={formData.lesson_summary}
                      onChange={handleInputChange}
                      placeholder="Brief summary of the lesson taught"
                    />

                    <Input
                      type="textarea"
                      label="Special Activities"
                      name="special_activities"
                      rows={3}
                      value={formData.special_activities}
                      onChange={handleInputChange}
                      placeholder="Any special activities or games conducted"
                    />
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                    Issues & Challenges
                  </h3>
                  <Input
                    type="textarea"
                    label="Issues Encountered"
                    name="issues_encountered"
                    rows={3}
                    value={formData.issues_encountered}
                    onChange={handleInputChange}
                    placeholder="Any issues or challenges faced during the service"
                  />
                </motion.div>
              </form>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 sticky bottom-0">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={showServiceList ? handleClose : handleBack}
              disabled={isSaving}
            >
              {showServiceList ? 'Cancel' : 'Back'}
            </Button>
            {!showServiceList && (
              <Button
                type="submit"
                variant="primary"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    {existingNoteId ? 'Updating...' : 'Saving...'}
                  </span>
                ) : (
                  existingNoteId ? 'Save Changes' : 'Save Notes'
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ServiceNotesForm;