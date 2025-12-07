import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Badge } from '../ui';

const StaffScheduleDetailModal = ({ isOpen, onClose, selectedDate, groupAssignmentsByService, formatTime, getRoleBadgeVariant, getStaffGradient }) => {
  if (!isOpen || !selectedDate) return null;

  // Get events (volunteers) for this date
  const volunteers = selectedDate.events || [];

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
            {selectedDate ? `Volunteer Schedule for ${selectedDate.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
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
              <p className="text-sm text-gray-600 mb-1">Total Volunteers</p>
              <p className="text-2xl font-bold text-nextgen-blue-dark">
                {volunteers.length}
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
                {Object.keys(groupAssignmentsByService(volunteers)).length}
              </p>
            </motion.div>
            <motion.div 
              className="bg-green-50 p-4 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-sm text-gray-600 mb-1">Physical Roles</p>
              <p className="text-2xl font-bold text-green-700">
                {new Set(volunteers.map(v => v.physicalRole || v.role)).size}
              </p>
            </motion.div>
          </div>

          {/* Volunteers grouped by service */}
          <div className="space-y-6">
            {Object.entries(groupAssignmentsByService(volunteers)).map(([serviceName, serviceVolunteers], serviceIdx) => {
              
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
                        <p className="text-sm text-gray-600">
                          Sunday • {serviceVolunteers[0]?.startTime || 'Time TBD'}
                        </p>
                      </div>
                      <Badge variant="primary" size="sm">
                        {serviceVolunteers.length} {serviceVolunteers.length === 1 ? 'Volunteer' : 'Volunteers'}
                      </Badge>
                    </div>
                  </div>

                  {/* Volunteer List */}
                  <div className="divide-y divide-gray-100">
                    {serviceVolunteers.map((volunteer, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (serviceIdx * 0.1) + (idx * 0.05) }}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Volunteer Avatar */}
                            <div className="h-10 w-10 rounded-full overflow-hidden shadow-md flex-shrink-0">
                              {volunteer.profileImage ? (
                                <img 
                                  src={volunteer.profileImage}
                                  alt={volunteer.volunteerName}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`h-full w-full rounded-full bg-gradient-to-br ${volunteer.profileGradient || 'from-blue-500 to-purple-600'} flex items-center justify-center text-white font-semibold ${volunteer.profileImage ? 'hidden' : ''}`}
                                style={!volunteer.profileImage ? { display: 'flex' } : {}}
                              >
                                {volunteer.firstName?.charAt(0) || volunteer.volunteerName?.charAt(0) || 'V'}
                              </div>
                            </div>

                            {/* Volunteer Info */}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">
                                  {volunteer.volunteerName}
                                </p>
                                {volunteer.isRegisteredStaff && (
                                  <Badge variant="success" size="xs">
                                    Staff
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {/* Physical Role from Cal.com */}
                                {volunteer.physicalRole && volunteer.physicalRole !== 'Volunteer' && (
                                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                    {volunteer.physicalRole}
                                  </span>
                                )}
                                {/* Staff Role from database */}
                                {volunteer.staffRole && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-500 capitalize">
                                      {volunteer.staffRole}
                                    </span>
                                  </>
                                )}
                                {/* Email */}
                                {volunteer.volunteerEmail && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-500">{volunteer.volunteerEmail}</span>
                                  </>
                                )}
                                {/* Phone */}
                                {volunteer.phone && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-500">{volunteer.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Time indicator */}
                          <div className="flex items-center gap-1 text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs">{volunteer.startTime} - {volunteer.endTime}</span>
                          </div>
                        </div>

                        {/* Description/Notes */}
                        {volunteer.description && (
                          <div className="mt-3 pl-13">
                            <div className="bg-gray-50 rounded-md p-2 border-l-2 border-nextgen-blue">
                              <p className="text-sm text-gray-700 italic">{volunteer.description}</p>
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
