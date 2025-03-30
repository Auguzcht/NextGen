import { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import supabase from '../services/supabase.js';
import StaffAssignmentsList from '../components/staff/StaffAssignmentsList.jsx';

const StaffSchedulePage = () => {
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffMembers, setStaffMembers] = useState([]);

  useEffect(() => {
    fetchStaff();
    fetchUpcomingAssignments();
  }, [selectedStaff]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('staff_id, first_name, last_name')
        .eq('is_active', true)
        .order('last_name');

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchUpcomingAssignments = async () => {
    setLoading(true);
    try {
      // Get today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get date 30 days in the future
      const future = new Date();
      future.setDate(future.getDate() + 30);
      const futureStr = future.toISOString().split('T')[0];

      let query = supabase
        .from('staff_assignments')
        .select(`
          *,
          staff(first_name, last_name),
          services(service_name, day_of_week, start_time)
        `)
        .gte('assignment_date', todayStr)
        .lte('assignment_date', futureStr);
      
      if (selectedStaff) {
        query = query.eq('staff_id', selectedStaff);
      }
      
      query = query.order('assignment_date', { ascending: true });
      
      const { data, error } = await query;

      if (error) throw error;
      setUpcomingAssignments(data || []);
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffChange = (e) => {
    setSelectedStaff(e.target.value);
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Staff Filter */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Staff Schedule</h2>
          
          <div className="w-full sm:w-1/2">
            <label htmlFor="staff-select" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Staff Member
            </label>
            <select
              id="staff-select"
              value={selectedStaff}
              onChange={handleStaffChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Staff Members</option>
              {staffMembers.map((staff) => (
                <option key={staff.staff_id} value={staff.staff_id}>
                  {staff.first_name} {staff.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff Assignments List */}
        <StaffAssignmentsList />

        {/* Upcoming Schedule */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Schedule</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : upcomingAssignments.length === 0 ? (
            <div className="bg-gray-50 p-4 text-center rounded-md">
              <p className="text-gray-500">No upcoming assignments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {upcomingAssignments.map((assignment) => (
                    <tr key={assignment.assignment_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(assignment.assignment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.staff.first_name} {assignment.staff.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignment.services.service_name} ({assignment.services.day_of_week})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="capitalize">{assignment.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default StaffSchedulePage;