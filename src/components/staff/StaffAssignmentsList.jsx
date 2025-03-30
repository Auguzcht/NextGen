import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import StaffAssignmentForm from './StaffAssignmentForm.jsx';

const StaffAssignmentsList = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    // Format as YYYY-MM-DD
    return today.toISOString().split('T')[0];
  });
  const [selectedService, setSelectedService] = useState('');
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchServices();
    fetchAssignments();
  }, [currentDate, selectedService]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('service_id, service_name, day_of_week')
        .order('service_name');

      if (error) throw error;
      setServices(data || []);
      
      // Set first service as default if available
      if (data?.length > 0 && !selectedService) {
        setSelectedService(data[0].service_id);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('staff_assignments')
        .select(`
          *,
          staff(first_name, last_name, role),
          services(service_name, day_of_week)
        `)
        .eq('assignment_date', currentDate);
      
      if (selectedService) {
        query = query.eq('service_id', selectedService);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setCurrentDate(e.target.value);
  };

  const handleServiceChange = (e) => {
    setSelectedService(e.target.value);
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('staff_assignments')
        .delete()
        .eq('assignment_id', assignmentId);

      if (error) throw error;
      
      // Refresh assignments
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Staff Assignments</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Add Assignment
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/2">
          <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date-select"
            value={currentDate}
            onChange={handleDateChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        <div className="w-full sm:w-1/2">
          <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            id="service-select"
            value={selectedService}
            onChange={handleServiceChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Services</option>
            {services.map((service) => (
              <option key={service.service_id} value={service.service_id}>
                {service.service_name} ({service.day_of_week})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-gray-50 p-4 text-center rounded-md">
          <p className="text-gray-500">No staff assignments for this date and service.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assignment.staff.first_name} {assignment.staff.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.services.service_name} ({assignment.services.day_of_week})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="capitalize">{assignment.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.notes || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDeleteAssignment(assignment.assignment_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StaffAssignmentForm 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAssignments}
      />
    </div>
  );
};

export default StaffAssignmentsList;