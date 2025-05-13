import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Badge, Button, Modal } from '../ui';
import { motion } from 'framer-motion';

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
          services(service_name, day_of_week, start_time)
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
    if (!dateStr) return 'N/A';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Member Details"
      size="3xl"
      variant="primary"
    >
      {loading ? (
        <div className="flex justify-center items-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
        </div>
      ) : staff ? (
        <div className="overflow-auto max-h-[70vh]">
          <div className="px-4 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-start mb-4">
                <div className="h-12 w-12 rounded-full bg-nextgen-blue/10 flex items-center justify-center text-nextgen-blue-dark font-medium text-lg mr-3">
                  {staff.first_name?.charAt(0) || '?'}
                  {staff.last_name?.charAt(0) || ''}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-nextgen-blue-dark">Personal Information</h4>
                  <p className="text-sm text-gray-500">{staff.role && staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{staff.first_name} {staff.last_name}</p>
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
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge 
                    variant={staff.is_active ? "success" : "danger"} 
                    size="sm"
                    className="mt-1"
                  >
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {staff.user_id && (
                    <Badge variant="primary" size="sm" className="ml-2 mt-1">
                      Has Login
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(staff.created_date)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Statistics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-nextgen-blue/5 p-4 rounded-lg">
                    <p className="text-sm font-medium text-nextgen-blue-dark">Total Assignments</p>
                    <p className="mt-1 text-2xl font-semibold text-nextgen-blue">{stats.totalAssignments}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-700">Upcoming</p>
                    <p className="mt-1 text-2xl font-semibold text-green-600">{stats.upcomingAssignments}</p>
                  </div>
                  <div className="bg-nextgen-orange/5 p-4 rounded-lg">
                    <p className="text-sm font-medium text-nextgen-orange-dark">Services</p>
                    <p className="mt-1 text-2xl font-semibold text-nextgen-orange">{stats.servicesWorked}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Recent Assignments</h4>
                {assignments.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-md text-center">No recent assignments</p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {assignments.map((assignment) => (
                        <motion.li 
                          key={assignment.assignment_id} 
                          className="px-4 py-3"
                          whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{formatDate(assignment.assignment_date)}</p>
                              <p className="text-sm text-gray-500">
                                {assignment.services.service_name} ({assignment.services.day_of_week})
                                {assignment.services.start_time && ` at ${formatTime(assignment.services.start_time)}`}
                              </p>
                            </div>
                            <Badge variant="primary" size="sm" className="capitalize">
                              {assignment.role}
                            </Badge>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center p-6">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500">Staff member not found</p>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default StaffDetailView;