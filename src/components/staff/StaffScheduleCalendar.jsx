import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '../../services/supabase.js';
import { Card, Badge, Button } from '../ui';
import Swal from 'sweetalert2';
import StaffScheduleDetailModal from './StaffScheduleDetailModal.jsx';

const StaffScheduleCalendar = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateAssignments, setDateAssignments] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [direction, setDirection] = useState(0); // Track swipe direction

  useEffect(() => {
    fetchAssignments();
  }, [currentMonth]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Get assignments for current month and next 2 months
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 3, 0);

      const { data, error } = await supabase
        .from('staff_assignments')
        .select(`
          *,
          staff(staff_id, first_name, last_name, role, profile_image_url, profile_image_path),
          services(service_id, service_name, day_of_week, start_time)
        `)
        .gte('assignment_date', startDate.toISOString().split('T')[0])
        .lte('assignment_date', endDate.toISOString().split('T')[0])
        .order('assignment_date', { ascending: true });

      if (error) throw error;

      // Group assignments by staff + date + role + notes (created at same time)
      const groupedByStaff = {};
      data?.forEach(assignment => {
        const key = `${assignment.staff_id}-${assignment.assignment_date}-${assignment.role}-${assignment.notes || ''}`;
        if (!groupedByStaff[key]) {
          groupedByStaff[key] = {
            ...assignment,
            services: [assignment.services],
            assignment_ids: [assignment.assignment_id]
          };
        } else {
          groupedByStaff[key].services.push(assignment.services);
          groupedByStaff[key].assignment_ids.push(assignment.assignment_id);
        }
      });
      
      const groupedData = Object.values(groupedByStaff);

      // Group by date for calendar display
      const grouped = {};
      groupedData.forEach(assignment => {
        const date = assignment.assignment_date;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(assignment);
      });

      setDateAssignments(grouped);
      setAssignments(groupedData);
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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateStr = currentDate.toISOString().split('T')[0];
      days.push({
        date: currentDate,
        dateStr,
        day,
        assignments: dateAssignments[dateStr] || [],
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isPast: currentDate < new Date(new Date().setHours(0, 0, 0, 0))
      });
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setDirection(-1);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setDirection(1);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleToday = () => {
    setDirection(0);
    setCurrentMonth(new Date());
  };

  const handleDateClick = (day) => {
    if (day && day.assignments.length > 0) {
      setSelectedDate(day);
      setModalOpen(true);
    }
  };

  const groupAssignmentsByService = (assignments) => {
    const grouped = {};
    assignments.forEach(assignment => {
      // Handle both single service and array of services
      const services = Array.isArray(assignment.services) ? assignment.services : [assignment.services];
      services.forEach(service => {
        const serviceName = service?.service_name || 'Unknown Service';
        if (!grouped[serviceName]) {
          grouped[serviceName] = [];
        }
        // Create a copy with single service for display
        grouped[serviceName].push({
          ...assignment,
          services: service,
          allServices: assignment.services // Keep original for reference
        });
      });
    });
    return grouped;
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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = getDaysInMonth(currentMonth);

  // Animation variants for month transitions
  const calendarVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 100 : direction < 0 ? -100 : 0,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction > 0 ? -100 : direction < 0 ? 100 : 0,
      opacity: 0
    })
  };

  // Staggered animation for calendar cells
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.01,
        delayChildren: 0.1
      }
    }
  };

  const cellVariants = {
    hidden: { 
      opacity: 0,
      y: 10
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "tween",
        duration: 0.2,
        ease: "easeOut"
      }
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

  return (
    <>
      <Card variant="minimal" className="mb-6">
        {/* Calendar Header */}
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div>
            <AnimatePresence mode="wait">
              <motion.h3 
                key={`${currentMonth.getMonth()}-${currentMonth.getFullYear()}`}
                className="text-2xl font-bold text-nextgen-blue-dark"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </motion.h3>
            </AnimatePresence>
            <motion.p 
              className="text-sm text-gray-500 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'} this period
            </motion.p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="text-xs"
            >
              Today
            </Button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                }
              />
            </div>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div 
          className="flex items-center gap-4 mb-4 text-xs text-gray-600"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-nextgen-blue"></div>
            <span>Has Assignments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-nextgen-orange"></div>
            <span>Today</span>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
          </div>
        ) : (
          <motion.div 
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {/* Week day headers */}
            <motion.div 
              className="grid grid-cols-7 bg-gray-50 border-b border-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {weekDays.map((day, i) => (
                <motion.div 
                  key={day} 
                  className="p-3 text-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.03) }}
                >
                  <span className="text-xs font-semibold text-gray-700 uppercase">{day.substring(0, 3)}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Calendar grid with month transition */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div 
                key={`${currentMonth.getMonth()}-${currentMonth.getFullYear()}`}
                custom={direction}
                variants={calendarVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "tween", duration: 0.3, ease: "easeInOut" },
                  opacity: { duration: 0.2 }
                }}
                className="grid grid-cols-7 auto-rows-fr"
              >
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="contents"
                >
                  {days.map((day, index) => (
                    <motion.div
                      key={index}
                      variants={cellVariants}
                      className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
                        day ? 'bg-white hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
                      } ${day?.isPast && !day?.isToday ? 'opacity-60' : ''} transition-colors`}
                      onClick={() => day && handleDateClick(day)}
                      whileHover={day && day.assignments.length > 0 ? { 
                        backgroundColor: 'rgba(48, 206, 228, 0.05)'
                      } : {}}
                    >
                      {day && (
                        <div className="h-full flex flex-col">
                          {/* Date number */}
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-sm font-semibold ${
                                day.isToday
                                  ? 'bg-nextgen-orange text-white w-7 h-7 rounded-full flex items-center justify-center'
                                  : day.isPast
                                  ? 'text-gray-400'
                                  : 'text-gray-700'
                              }`}
                            >
                              {day.day}
                            </span>
                            {day.assignments.length > 0 && (
                              <Badge variant="primary" size="xs">
                                {day.assignments.length}
                              </Badge>
                            )}
                          </div>

                          {/* Assignment tags */}
                          <div className="flex-1 space-y-1 overflow-y-auto">
                            {day.assignments.slice(0, 3).map((assignment, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-1 p-1 bg-nextgen-blue/10 rounded text-xs text-nextgen-blue-dark truncate hover:bg-nextgen-blue/20 transition-colors"
                              >
                                {/* Staff Avatar - small version */}
                                <div className="flex-shrink-0 w-5 h-5 rounded-full overflow-hidden">
                                  {assignment.staff?.profile_image_url ? (
                                    <img 
                                      src={assignment.staff.profile_image_url}
                                      alt={`${assignment.staff?.first_name}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.parentNode.innerHTML = `
                                          <div class="w-full h-full rounded-full ${getStaffGradient(assignment.staff?.staff_id)} flex items-center justify-center text-white text-[10px] font-medium">
                                            ${assignment.staff?.first_name?.charAt(0) || '?'}
                                          </div>
                                        `;
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-full h-full rounded-full ${getStaffGradient(assignment.staff?.staff_id)} flex items-center justify-center text-white text-[10px] font-medium`}>
                                      {assignment.staff?.first_name?.charAt(0) || '?'}
                                    </div>
                                  )}
                                </div>
                                <span className="truncate font-medium">
                                  {assignment.staff?.first_name}
                                </span>
                              </motion.div>
                            ))}
                            {day.assignments.length > 3 && (
                              <div className="text-[10px] text-gray-500 text-center py-1">
                                +{day.assignments.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </Card>

      {/* Assignment Details Modal */}
      <StaffScheduleDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedDate={selectedDate}
        groupAssignmentsByService={groupAssignmentsByService}
        formatTime={formatTime}
        getRoleBadgeVariant={getRoleBadgeVariant}
        getStaffGradient={getStaffGradient}
      />
    </>
  );
};

export default StaffScheduleCalendar;