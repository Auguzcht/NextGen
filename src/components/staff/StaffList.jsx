import { useState, useMemo } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Badge, useToast } from '../ui';
import { motion } from 'framer-motion';

const StaffList = ({ staffMembers, onRefresh, onView, onEdit, onCreateCredentials }) => {
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState(null);

  const toggleActiveStatus = async (staffId, currentStatus) => {
    setUpdatingId(staffId);
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !currentStatus })
        .eq('staff_id', staffId);

      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating staff status:', error);
      toast.error('Status Update Failed', {
        description: error.message || 'Failed to update staff status. Please try again.'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Generate consistent gradient for staff avatar
  const getStaffGradient = (staffId) => {
    const colors = [
      'from-nextgen-blue to-nextgen-blue-dark',
      'from-nextgen-orange to-nextgen-orange-dark',
      'from-nextgen-blue-light to-nextgen-blue',
      'from-nextgen-orange-light to-nextgen-orange',
      'from-blue-500 to-indigo-600',
      'from-orange-500 to-amber-500'
    ];
    
    const index = staffId % colors.length;
    return `bg-gradient-to-br ${colors[index]}`;
  };

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Activity
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staffMembers.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                No staff members found
              </td>
            </tr>
          ) : (
            staffMembers.map((staff) => (
              <motion.tr 
                key={staff.staff_id} 
                whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                className="group"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full overflow-hidden mr-3 flex-shrink-0">
                      {staff.profile_image_url ? (
                        <img 
                          src={staff.profile_image_url}
                          alt={`${staff.first_name} ${staff.last_name}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = `
                              <div class="h-full w-full rounded-full ${getStaffGradient(staff.staff_id)} flex items-center justify-center text-white text-sm font-medium">
                                ${staff.first_name?.charAt(0) || ''}${staff.last_name?.charAt(0) || ''}
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className={`h-full w-full rounded-full ${getStaffGradient(staff.staff_id)} flex items-center justify-center text-white text-sm font-medium`}>
                          {staff.first_name?.charAt(0) || '?'}
                          {staff.last_name?.charAt(0) || ''}
                        </div>
                      )}
                    </div>
                    <span>{staff.first_name} {staff.last_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {staff.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {staff.phone_number || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="capitalize">{staff.role}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-32">
                  <div className="flex flex-col gap-1.5 w-full">
                    <Badge 
                      variant={staff.is_active ? "success" : "danger"} 
                      size="sm"
                      className="w-full justify-center"
                    >
                      {staff.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {staff.user_id && (
                      <Badge 
                        variant="primary" 
                        size="sm"
                        className="w-full justify-center"
                      >
                        Has Login
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {staff.last_login_at ? (
                    <span className="text-green-600">
                      {new Date(staff.last_login_at).toLocaleDateString()}
                    </span>
                  ) : staff.credentials_sent_at ? (
                    <span className="text-yellow-600">
                      Pending
                    </span>
                  ) : staff.user_id ? (
                    <span className="text-blue-600">
                      Never logged in
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      No account
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onView(staff)}
                      className="text-nextgen-blue"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      }
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onEdit(staff)}
                      className="text-nextgen-blue"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      }
                    >
                      Edit
                    </Button>
                    {!staff.user_id && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onCreateCredentials(staff)}
                        className="text-green-600"
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        }
                      >
                        Create Login
                      </Button>
                    )}
                    <Button
                      variant={staff.is_active ? "danger" : "success"}
                      size="xs"
                      onClick={() => toggleActiveStatus(staff.staff_id, staff.is_active)}
                      disabled={updatingId === staff.staff_id}
                      isLoading={updatingId === staff.staff_id}
                    >
                      {staff.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StaffList;