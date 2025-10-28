import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import StaffAssignmentForm from './StaffAssignmentForm.jsx';
import { Card, Table, Button, Badge } from '../ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const StaffAssignmentsList = ({ onAddClick }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('staff_assignments')
        .select(`
          *,
          staff(staff_id, first_name, last_name, role, profile_image_url, profile_image_path),
          services(service_name, day_of_week, start_time)
        `)
        .gte('assignment_date', today)
        .order('assignment_date', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load assignments'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId, staffName, serviceName, date) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `Remove <strong>${staffName}</strong> from <strong>${serviceName}</strong> on <strong>${formatDate(date)}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setDeletingId(assignmentId);
      try {
        const { error } = await supabase
          .from('staff_assignments')
          .delete()
          .eq('assignment_id', assignmentId);

        if (error) throw error;
        
        Swal.fire({
          icon: 'success',
          title: 'Removed!',
          text: 'Assignment has been removed.',
          timer: 1500
        });
        
        fetchAssignments();
      } catch (error) {
        console.error('Error deleting assignment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to remove assignment'
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  // Add gradient generator for staff avatars
  const getStaffGradient = (staffId) => {
    const colors = [
      'from-nextgen-blue to-nextgen-blue-dark',
      'from-nextgen-orange to-nextgen-orange-dark',
      'from-nextgen-blue-light to-nextgen-blue',
      'from-nextgen-orange-light to-nextgen-orange',
      'from-blue-500 to-indigo-600',
      'from-orange-500 to-amber-500'
    ];
    
    const index = (staffId || 0) % colors.length;
    return `bg-gradient-to-br ${colors[index]}`;
  };

  // Get role badge variant based on assignment role
  const getRoleBadgeVariant = (role) => {
    const roleLower = role?.toLowerCase() || '';
    switch (roleLower) {
      case 'leader':
        return 'purple';
      case 'teacher':
        return 'success';
      case 'helper':
        return 'info';
      case 'check-in':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  // Define table columns
  const columns = [
    {
      header: "Date",
      cell: (row) => (
        <div className="font-medium text-gray-900">
          {formatDate(row.assignment_date)}
        </div>
      ),
      width: "180px"
    },
    {
      header: "Staff Member",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
            {row.staff?.profile_image_url ? (
              <img 
                src={row.staff.profile_image_url}
                alt={`${row.staff.first_name} ${row.staff.last_name}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `
                    <div class="h-full w-full rounded-full ${getStaffGradient(row.staff_id)} flex items-center justify-center text-white text-sm font-medium">
                      ${row.staff?.first_name?.charAt(0) || '?'}${row.staff?.last_name?.charAt(0) || ''}
                    </div>
                  `;
                }}
              />
            ) : (
              <div className={`h-full w-full rounded-full ${getStaffGradient(row.staff_id)} flex items-center justify-center text-white text-sm font-medium`}>
                {row.staff?.first_name?.charAt(0) || '?'}
                {row.staff?.last_name?.charAt(0) || ''}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {row.staff?.first_name} {row.staff?.last_name}
            </div>
            <div className="text-xs text-gray-500 capitalize">{row.staff?.role}</div>
          </div>
        </div>
      ),
      width: "250px"
    },
    {
      header: "Service",
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.services?.service_name}</div>
          <div className="text-sm text-gray-500">
            {row.services?.day_of_week}
            {row.services?.start_time && ` • ${formatTime(row.services.start_time)}`}
          </div>
        </div>
      ),
      width: "220px"
    },
    {
      header: "Role",
      cell: (row) => (
        <Badge variant={getRoleBadgeVariant(row.role)} size="sm" className="capitalize">
          {row.role || 'N/A'}
        </Badge>
      ),
      width: "120px"
    },
    {
      header: "Notes",
      cell: (row) => (
        <div className="text-sm text-gray-600 max-w-xs truncate" title={row.notes}>
          {row.notes || '-'}
        </div>
      ),
      width: "200px"
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          variant="danger"
          size="xs"
          onClick={() => handleDeleteAssignment(
            row.assignment_id,
            `${row.staff?.first_name} ${row.staff?.last_name}`,
            row.services?.service_name,
            row.assignment_date
          )}
          disabled={deletingId === row.assignment_id}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        >
          Remove
        </Button>
      ),
      width: "120px"
    }
  ];

  return (
    <Card variant="minimal" className="mb-6">
      {/* Header with title and Add button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-nextgen-blue-dark">Upcoming Assignments</h3>
          <p className="text-sm text-gray-500 mt-1">
            {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'} scheduled
          </p>
        </div>
        
        <Button
          variant="primary"
          onClick={onAddClick || (() => setIsModalOpen(true))}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          }
        >
          Add Assignment
        </Button>
      </div>

      {/* Assignments Table */}
      <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
        <Table
          data={assignments}
          columns={columns}
          isLoading={loading}
          noDataMessage="No upcoming assignments found"
          highlightOnHover={true}
          variant="primary"
          stickyHeader={true}
        />
      </div>

      {/* Assignment Form Modal */}
      <StaffAssignmentForm 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchAssignments();
        }}
      />
    </Card>
  );
};

export default StaffAssignmentsList;