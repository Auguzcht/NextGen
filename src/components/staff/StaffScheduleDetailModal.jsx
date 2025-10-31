import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Badge } from '../ui';

const StaffScheduleDetailModal = ({ isOpen, onClose, selectedDate, groupAssignmentsByService, formatTime, getRoleBadgeVariant, getStaffGradient }) => {
  if (!isOpen || !selectedDate) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <motion.div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {selectedDate ? `Assignments for ${selectedDate.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <motion.div 
          className="p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <motion.div 
              className="bg-nextgen-blue/5 p-4 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-sm text-gray-600 mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-nextgen-blue-dark">
                {selectedDate.assignments.length}
              </p>
            </motion.div>
            <motion.div 
              className="bg-nextgen-orange/5 p-4 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-sm text-gray-600 mb-1">Services</p>
              <p className="text-2xl font-bold text-nextgen-orange-dark">
                {Object.keys(groupAssignmentsByService(selectedDate.assignments)).length}
              </p>
            </motion.div>
            <motion.div 
              className="bg-green-50 p-4 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm text-gray-600 mb-1">Roles Filled</p>
              <p className="text-2xl font-bold text-green-700">
                {new Set(selectedDate.assignments.map(a => a.role)).size}
              </p>
            </motion.div>
          </div>

          {/* Assignments grouped by service */}
          <div className="space-y-6">
            {Object.entries(groupAssignmentsByService(selectedDate.assignments)).map(([serviceName, serviceAssignments], serviceIdx) => {
              const service = serviceAssignments[0]?.services;
              
              return (
                <motion.div
                  key={serviceName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + (serviceIdx * 0.1) }}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Service Header */}
                  <div className="bg-gradient-to-r from-nextgen-blue/10 to-nextgen-blue/5 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-nextgen-blue-dark">{serviceName}</h4>
                        {service && (
                          <p className="text-sm text-gray-600">
                            {service.day_of_week}
                            {service.start_time && ` • ${formatTime(service.start_time)}`}
                          </p>
                        )}
                      </div>
                      <Badge variant="primary" size="sm">
                        {serviceAssignments.length} {serviceAssignments.length === 1 ? 'Staff' : 'Staff'}
                      </Badge>
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="divide-y divide-gray-100">
                    {serviceAssignments.map((assignment, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (serviceIdx * 0.1) + (idx * 0.05) }}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Staff Avatar with photo or gradient fallback */}
                            <div className="h-10 w-10 rounded-full overflow-hidden shadow-md flex-shrink-0">
                              {assignment.staff?.profile_image_url ? (
                                <img 
                                  src={assignment.staff.profile_image_url}
                                  alt={`${assignment.staff.first_name} ${assignment.staff.last_name}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentNode.innerHTML = `
                                      <div class="h-full w-full rounded-full ${getStaffGradient(assignment.staff_id)} flex items-center justify-center text-white font-semibold">
                                        ${assignment.staff?.first_name?.charAt(0) || '?'}${assignment.staff?.last_name?.charAt(0) || ''}
                                      </div>
                                    `;
                                  }}
                                />
                              ) : (
                                <div className={`h-full w-full rounded-full ${getStaffGradient(assignment.staff_id)} flex items-center justify-center text-white font-semibold`}>
                                  {assignment.staff?.first_name?.charAt(0) || '?'}
                                  {assignment.staff?.last_name?.charAt(0) || ''}
                                </div>
                              )}
                            </div>

                            {/* Staff Info */}
                            <div>
                              <p className="font-semibold text-gray-900">
                                {assignment.staff?.first_name} {assignment.staff?.last_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 capitalize">
                                  {assignment.staff?.role}
                                </span>
                                <span className="text-gray-300">•</span>
                                <Badge variant={getRoleBadgeVariant(assignment.role)} size="xs" className="capitalize">
                                  {assignment.role || 'Helper'}
                                </Badge>
                                {/* Show multiple services badge if applicable */}
                                {assignment.allServices && Array.isArray(assignment.allServices) && assignment.allServices.length > 1 && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <Badge variant="info" size="xs">
                                      {assignment.allServices.length} services
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes indicator */}
                          {assignment.notes && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {assignment.notes && (
                          <div className="mt-3 pl-13">
                            <div className="bg-gray-50 rounded-md p-2 border-l-2 border-nextgen-blue">
                              <p className="text-sm text-gray-700 italic">{assignment.notes}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>,
    document.body
  );
};

export default StaffScheduleDetailModal;
