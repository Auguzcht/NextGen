import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Input, Modal } from '../ui';

const StaffAssignmentForm = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);
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
    setError(null);
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
      setError(error.message);
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
    setError(null);

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
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Create a footer with action buttons for the modal
  const modalFooter = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={submitting}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={submitting || loading}
        isLoading={submitting}
      >
        {submitting ? 'Assigning...' : 'Assign'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Staff Member"
      footer={modalFooter}
      size="md"
      variant="primary"
    >
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-nextgen-blue"></div>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700">
              Staff Member
            </label>
            <select
              id="staff_id"
              name="staff_id"
              value={formData.staff_id}
              onChange={handleInputChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm rounded-md"
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
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm rounded-md"
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
            <Input
              type="date"
              id="assignment_date"
              name="assignment_date"
              value={formData.assignment_date}
              onChange={handleInputChange}
              required
              fullWidth
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
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm rounded-md"
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
              className="shadow-sm focus:ring-nextgen-blue focus:border-nextgen-blue mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
            ></textarea>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default StaffAssignmentForm;