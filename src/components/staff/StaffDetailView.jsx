import { useState, useEffect, useMemo } from 'react';
import supabase from '../../services/supabase.js';
import { Badge, Modal } from '../ui';
import { motion } from 'framer-motion';

const StaffDetailView = ({ staff: initialStaff, staffId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState(initialStaff || null);

  useEffect(() => {
    if (isOpen && initialStaff) {
      setStaff(initialStaff);
    }
  }, [isOpen, initialStaff]);

  // Generate consistent gradient for staff avatar
  const staffGradient = useMemo(() => {
    if (!staff?.staff_id) return 'bg-gradient-to-br from-nextgen-blue to-nextgen-blue-dark';
    
    const colors = [
      'from-nextgen-blue to-nextgen-blue-dark',
      'from-nextgen-orange to-nextgen-orange-dark',
      'from-nextgen-blue-light to-nextgen-blue',
      'from-nextgen-orange-light to-nextgen-orange',
      'from-blue-500 to-indigo-600',
      'from-orange-500 to-amber-500'
    ];
    
    const index = staff.staff_id % colors.length;
    return `bg-gradient-to-br ${colors[index]}`;
  }, [staff?.staff_id]);

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

  const stats = staff?.stats || {
    totalAssignments: 0,
    upcomingAssignments: 0,
    servicesWorked: 0
  };

  const recentAssignment = staff?.recentAssignment;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Member Details"
      size="3xl"
      variant="primary"
    >
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
        </div>
      ) : staff ? (
        <motion.div 
          className="overflow-auto max-h-[70vh]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information - Left Column */}
            <motion.div 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-start mb-4">
                {/* Staff Avatar with photo or gradient fallback */}
                <div className="h-12 w-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
                  {staff.profile_image_url ? (
                    <img 
                      src={staff.profile_image_url}
                      alt={`${staff.first_name} ${staff.last_name}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = `
                          <div class="h-full w-full rounded-full ${staffGradient} flex items-center justify-center text-white font-medium text-lg">
                            ${staff.first_name?.charAt(0) || '?'}${staff.last_name?.charAt(0) || ''}
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className={`h-full w-full rounded-full ${staffGradient} flex items-center justify-center text-white font-medium text-lg`}>
                      {staff.first_name?.charAt(0) || '?'}
                      {staff.last_name?.charAt(0) || ''}
                    </div>
                  )}
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
                  <div className="mt-1">
                    <Badge 
                      variant={staff.is_active ? "success" : "danger"} 
                      size="sm"
                    >
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {staff.user_id && (
                      <Badge variant="primary" size="sm" className="ml-2">
                        Has Login
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(staff.created_date)}</p>
                </div>
              </div>
            </motion.div>

            {/* Statistics and Assignments - Right Column */}
            <div className="space-y-6 flex flex-col">
              {/* Statistics Section */}
              <motion.div 
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Statistics</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-nextgen-blue/5 p-3 rounded-lg text-center">
                    <p className="text-xs font-medium text-nextgen-blue-dark mb-1 leading-tight">Total<br/>Assignments</p>
                    {staff.stats ? (
                      <p className="mt-1 text-2xl font-semibold text-nextgen-blue">{stats.totalAssignments}</p>
                    ) : (
                      <div className="mt-1 h-8 w-12 mx-auto bg-gray-200 animate-pulse rounded"></div>
                    )}
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs font-medium text-green-700 mb-1 leading-tight">Upcoming<br/>Assignments</p>
                    {staff.stats ? (
                      <p className="mt-1 text-2xl font-semibold text-green-600">{stats.upcomingAssignments}</p>
                    ) : (
                      <div className="mt-1 h-8 w-12 mx-auto bg-gray-200 animate-pulse rounded"></div>
                    )}
                  </div>
                  <div className="bg-nextgen-orange/5 p-3 rounded-lg text-center">
                    <p className="text-xs font-medium text-nextgen-orange-dark mb-1 leading-tight">Services<br/>Worked</p>
                    {staff.stats ? (
                      <p className="mt-1 text-2xl font-semibold text-nextgen-orange">{stats.servicesWorked}</p>
                    ) : (
                      <div className="mt-1 h-8 w-12 mx-auto bg-gray-200 animate-pulse rounded"></div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Most Recent Assignment Section */}
              <motion.div 
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Most Recent Assignment</h4>
                {!staff.stats ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                ) : !recentAssignment ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <p className="text-sm text-gray-500 font-medium">No assignments yet</p>
                      <p className="text-xs text-gray-400 mt-1">This staff member hasn't been assigned</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-nextgen-blue/5 to-nextgen-blue/10 rounded-lg p-4 border border-nextgen-blue/20">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-nextgen-blue/20">
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(recentAssignment.assignment_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <Badge variant={getRoleBadgeVariant(recentAssignment.role)} size="xs" className="capitalize">
                          {recentAssignment.role}
                        </Badge>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900 text-sm mb-1">
                          {recentAssignment.services.service_name}
                        </p>
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-600">
                            {recentAssignment.services.day_of_week}
                            {recentAssignment.services.start_time && ` • ${formatTime(recentAssignment.services.start_time)}`}
                          </p>
                        </div>
                      </div>

                      {recentAssignment.notes && (
                        <div className="bg-white/60 rounded-md p-2 border border-nextgen-blue/10">
                          <p className="text-xs text-gray-700 italic">{recentAssignment.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
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