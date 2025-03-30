import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';

const StaffAssignmentForm = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    staff_id: '',
    service_id: '',
    assignment_date: new Date().toISOString().split('T')[0],
    role: 'helper',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchStaffAndServices();
    }
  }, [isOpen]);

  const fetchStaffAndServices = async () => {
    setLoading(true);
    try {
      // Fetch active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('staff_id, first_name, last_name')
        .eq('is_active', true)
        .order('last_name');

      if (staffError) throw staffError;

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('service_id, service_name, day_of_week')
        .order('service_name');

      if (servicesError) throw servicesError;

      setStaff(staffData || []);
      setServices(servicesData || []);

      // Set default values if data exists
      if (staffData?.length > 0) {
        setFormData(prev => ({ ...prev, staff_id: staffData[0].staff_id }));
      }
      if (servicesData?.length > 0) {
        setFormData(prev => ({ ...prev, service_id: servicesData[0].service_id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check if assignment already exists
      const { data: existingAssignments, error: checkError } = await supabase
        .from('staff_assignments')
        .select('assignment_id')
        .eq('staff_id', formData.staff_id)
        .eq('service_id', formData.service_id)
        .eq('assignment_date', formData.assignment_date);

      if (checkError) throw checkError;

      if (existingAssignments?.length > 0) {
        throw new Error('This staff member is already assigned to this service on this date');
      }

      // Create new assignment
      const { error } = await supabase
        .from('staff_assignments')
        .insert([formData]);

      if (error) throw error;

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Assign Staff Member</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-5 sm:p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6 space-y-4">
              <div>
                <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700">
                  Staff Member
                </label>
                <select
                  id="staff_id"
                  name="staff_id"
                  value={formData.staff_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  required
                >
                  {staff.map((staffMember) => (
                    <option key={staffMember.staff_id} value={staffMember.staff_id}>
                      {staffMember.first_name} {staffMember.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="service_id" className="block text-sm font-medium text-gray-700">
                  Service
                </label>
                <select
                  id="service_id"
                  name="service_id"
                  value={formData.service_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  required
                >
                  {services.map((service) => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.service_name} ({service.day_of_week})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assignment_date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="assignment_date"
                  name="assignment_date"
                  value={formData.assignment_date}
                  onChange={handleInputChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="helper">Helper</option>
                  <option value="teacher">Teacher</option>
                  <option value="leader">Leader</option>
                  <option value="check-in">Check-in</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                ></textarea>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Assign'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StaffAssignmentForm;