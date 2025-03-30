import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';

const StaffDetailView = ({ staffId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    upcomingAssignments: 0,
    servicesWorked: 0
  });

  useEffect(() => {
    if (isOpen && staffId) {
      fetchStaffDetails();
      fetchAssignments();
      fetchStats();
    }
  }, [isOpen, staffId]);

  const fetchStaffDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('staff_id', staffId)
        .single();

      if (error) throw error;
      setStaff(data);
    } catch (error) {
      console.error('Error fetching staff details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_assignments')
        .select(`
          *,
          services(service_name, day_of_week)
        `)
        .eq('staff_id', staffId)
        .order('assignment_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total assignments
      const { count: totalCount, error: totalError } = await supabase
        .from('staff_assignments')
        .select('assignment_id', { count: 'exact', head: true })
        .eq('staff_id', staffId);

      if (totalError) throw totalError;

      // Get upcoming assignments
      const today = new Date().toISOString().split('T')[0];
      const { count: upcomingCount, error: upcomingError } = await supabase
        .from('staff_assignments')
        .select('assignment_id', { count: 'exact', head: true })
        .eq('staff_id', staffId)
        .gte('assignment_date', today);

      if (upcomingError) throw upcomingError;

      // Get unique services worked
      const { data: servicesData, error: servicesError } = await supabase
        .from('staff_assignments')
        .select('service_id')
        .eq('staff_id', staffId);

      if (servicesError) throw servicesError;

      // Count unique service IDs
      const uniqueServices = new Set();
      servicesData?.forEach(item => uniqueServices.add(item.service_id));

      setStats({
        totalAssignments: totalCount || 0,
        upcomingAssignments: upcomingCount || 0,
        servicesWorked: uniqueServices.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-3xl w-full h-3/4 flex flex-col">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Staff Member Details</h3>
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
          <div className="flex-grow flex justify-center items-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : staff ? (
          <div className="flex-grow overflow-auto">
            <div className="px-4 py-5 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Full Name</p>
                    <p className="mt-1 text-sm text-gray-900">{staff.first_name} {staff.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{staff.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="mt-1 text-sm text-gray-900">{staff.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Role</p>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{staff.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${staff.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Member Since</p>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(staff.created_date)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Statistics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-indigo-800">Total Assignments</p>
                    <p className="mt-1 text-2xl font-semibold text-indigo-900">{stats.totalAssignments}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Upcoming</p>
                    <p className="mt-1 text-2xl font-semibold text-green-900">{stats.upcomingAssignments}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">Services</p>
                    <p className="mt-1 text-2xl font-semibold text-purple-900">{stats.servicesWorked}</p>
                  </div>
                </div>

                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Recent Assignments</h4>
                {assignments.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent assignments</p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <li key={assignment.assignment_id} className="px-4 py-3 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{formatDate(assignment.assignment_date)}</p>
                              <p className="text-sm text-gray-500">
                                {assignment.services.service_name} ({assignment.services.day_of_week})
                              </p>
                            </div>
                            <span className="capitalize text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                              {assignment.role}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex justify-center items-center p-6">
            <p className="text-gray-500">Staff member not found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDetailView;