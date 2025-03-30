import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';

const ServiceNotesForm = ({ serviceId, serviceDate, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    theme: '',
    lesson_summary: '',
    special_activities: '',
    issues_encountered: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [existingNoteId, setExistingNoteId] = useState(null);

  useEffect(() => {
    if (serviceId && serviceDate) {
      fetchExistingNotes();
    }
  }, [serviceId, serviceDate]);

  const fetchExistingNotes = async () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Get current staff session
      const { data: { session } } = await supabase.auth.getSession();
      const staffId = session?.user?.id;
      
      if (existingNoteId) {
        // Update existing note
        const { error } = await supabase
          .from('service_notes')
          .update({
            ...formData,
            recorded_by: staffId
          })
          .eq('note_id', existingNoteId);
        
        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase
          .from('service_notes')
          .insert([{
            ...formData,
            service_id: serviceId,
            service_date: serviceDate,
            recorded_by: staffId
          }]);
        
        if (error) throw error;
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving service notes:', error);
      alert(`Error saving service notes: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-2xl w-full">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Service Notes
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                  Theme/Topic
                </label>
                <input
                  type="text"
                  name="theme"
                  id="theme"
                  value={formData.theme}
                  onChange={handleInputChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Main theme or topic of the service"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="lesson_summary" className="block text-sm font-medium text-gray-700">
                  Lesson Summary
                </label>
                <textarea
                  name="lesson_summary"
                  id="lesson_summary"
                  rows={3}
                  value={formData.lesson_summary}
                  onChange={handleInputChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Brief summary of the lesson taught"
                ></textarea>
              </div>

              <div className="col-span-6">
                <label htmlFor="special_activities" className="block text-sm font-medium text-gray-700">
                  Special Activities
                </label>
                <textarea
                  name="special_activities"
                  id="special_activities"
                  rows={3}
                  value={formData.special_activities}
                  onChange={handleInputChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Any special activities or games conducted"
                ></textarea>
              </div>

              <div className="col-span-6">
                <label htmlFor="issues_encountered" className="block text-sm font-medium text-gray-700">
                  Issues Encountered
                </label>
                <textarea
                  name="issues_encountered"
                  id="issues_encountered"
                  rows={3}
                  value={formData.issues_encountered}
                  onChange={handleInputChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Any issues or challenges faced during the service"
                ></textarea>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceNotesForm;