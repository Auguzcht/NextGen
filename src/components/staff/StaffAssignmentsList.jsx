import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import StaffAssignmentForm from './StaffAssignmentForm.jsx';
import { Card, Table, Input, Button, Badge } from '../ui';

const StaffAssignmentsList = ({ onAddClick }) => {
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

  // Define table columns
  const columns = [
    {
      header: "Staff Member",
      accessor: (row) => `${row.staff.first_name} ${row.staff.last_name}`,
      cellClassName: "font-medium text-gray-900"
    },
    {
      header: "Service",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.services.service_name}</div>
          <div className="text-sm text-gray-500">{row.services.day_of_week}</div>
        </div>
      )
    },
    {
      header: "Role",
      cell: (row) => (
        <Badge variant="primary" size="sm">
          {row.role}
        </Badge>
      )
    },
    {
      header: "Notes",
      accessor: "notes",
      cell: (row) => row.notes || 'N/A'
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          variant="danger"
          size="xs"
          onClick={() => handleDeleteAssignment(row.assignment_id)}
        >
          Remove
        </Button>
      ),
      width: "100px"
    }
  ];

  return (
    <Card variant="minimal" className="mb-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full sm:w-2/5">
          <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <Input
            type="date"
            id="date-select"
            value={currentDate}
            onChange={handleDateChange}
            fullWidth
            className="h-10"
          />
        </div>
        
        <div className="w-full sm:w-1/4">
          <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            id="service-select"
            value={selectedService}
            onChange={handleServiceChange}
            className="block w-full h-11 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
          >
            <option value="">All Services</option>
            {services.map((service) => (
              <option key={service.service_id} value={service.service_id}>
                {service.service_name} ({service.day_of_week})
              </option>
            ))}
          </select>
        </div>
        
        <div className="w-full sm:w-1/5 sm:ml-auto sm:pl-2">
          <label className="block text-sm font-medium text-transparent mb-1">
            &nbsp;
          </label>
          <Button
            variant="primary"
            onClick={onAddClick || (() => setIsModalOpen(true))}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            }
            className="h-11 w-full"
          >
            Add Assignment
          </Button>
        </div>
      </div>

      <Table
        data={assignments}
        columns={columns}
        isLoading={loading}
        noDataMessage="No staff assignments for this date and service"
        highlightOnHover={true}
        variant="primary"
      />

      <StaffAssignmentForm 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAssignments}
      />
    </Card>
  );
};

export default StaffAssignmentsList;