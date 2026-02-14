import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, Button, useToast } from '../ui';
import StaffScheduleDetailModal from './StaffScheduleDetailModal.jsx';
import { fetchStaffAssignments, transformAssignmentsToEvents } from '../../services/staffAssignmentService.js';
import { downloadCalendarCSV, exportCalendarAsImage } from '../../services/calcomApi.js';

// Constants
const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const StaffScheduleCalendar = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateEvents, setDateEvents] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [direction, setDirection] = useState(0); // Track swipe direction
  const calendarRef = useRef(null); // Reference to calendar for image export

  useEffect(() => {
    fetchZohoEvents();
  }, [currentMonth]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      handleRefresh();
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [currentMonth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchZohoEvents();
    } finally {
      setRefreshing(false);
    }
  };

  const fetchZohoEvents = async () => {
    setLoading(true);
    try {
      // Get first day displayed on calendar (may be from previous month)
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      while (startDate.getDay() !== 0) { // 0 = Sunday
        startDate.setDate(startDate.getDate() - 1);
      }

      // Get last day displayed on calendar (may be from next month)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      while (endDate.getDay() !== 6) { // 6 = Saturday
        endDate.setDate(endDate.getDate() + 1);
      }

      // Fetch events from Supabase (populated by webhooks) - instant!
      console.log('📊 Fetching from Supabase (webhook-driven data)...');
      const assignments = await fetchStaffAssignments(startDate, endDate);
      const allEvents = transformAssignmentsToEvents(assignments);

      // Group events by date for calendar display (Philippine timezone)
      const grouped = {};
      allEvents.forEach(event => {
        // Convert UTC date to Philippine timezone date string (YYYY-MM-DD)
        const eventDate = new Date(event.start);
        const manilaDateStr = eventDate.toLocaleDateString('en-CA', { 
          timeZone: 'Asia/Manila'
        }); // en-CA gives YYYY-MM-DD format
        if (!grouped[manilaDateStr]) {
          grouped[manilaDateStr] = [];
        }
        grouped[manilaDateStr].push(event);
      });

      setDateEvents(grouped);
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
      toast.error('Failed to load volunteer schedule. Please refresh the page.', {
        description: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportSchedule = () => {
    try {
      downloadCalendarCSV(events, currentMonth);
      
      toast.success('Schedule has been downloaded as CSV', {
        description: 'Exported!'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Could not export schedule', {
        description: 'Export Failed'
      });
    }
  };

  const handleExportImage = async () => {
    try {
      if (!events || events.length === 0) {
        toast.error('No bookings to export', {
          description: 'No Data'
        });
        return;
      }

      await exportCalendarAsImage(events, currentMonth);
      
      toast.success('Styled schedule has been downloaded as PNG', {
        description: 'Exported!'
      });
    } catch (error) {
      console.error('Image export error:', error);
      toast.error(error.message || 'Could not export schedule as image', {
        description: 'Export Failed'
      });
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
      // Create date string in Philippine timezone (YYYY-MM-DD)
      const dateStr = currentDate.toLocaleDateString('en-CA');
      
      // Get today's date in Philippine timezone
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      
      // Compare for past dates
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      
      days.push({
        date: currentDate,
        dateStr,
        day,
        events: dateEvents[dateStr] || [],
        isToday,
        isPast,
        // Only show Sundays as they have services
        isSunday: currentDate.getDay() === 0
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
    if (day && day.events.length > 0) {
      setSelectedDate(day);
      setModalOpen(true);
    }
  };

  const groupEventsByService = (events) => {
    const grouped = {
      'First Service': [],
      'Second Service': [],
      'Third Service': []
    };
    
    events.forEach(event => {
      if (event.serviceName && grouped[event.serviceName]) {
        grouped[event.serviceName].push(event);
      }
    });

    return grouped;
  };

  const groupAssignmentsByService = (events) => {
    const grouped = {};
    events.forEach(event => {
      const serviceName = event.serviceName || 'Unknown Service';
      if (!grouped[serviceName]) {
        grouped[serviceName] = [];
      }
      grouped[serviceName].push({
        ...event,
        services: { service_name: event.serviceName } // Compatibility with modal
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
      <Card variant="minimal" className="mb-6" ref={calendarRef}>
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
              {events.length} {events.length === 1 ? 'volunteer' : 'volunteers'} scheduled
            </motion.p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg text-nextgen-blue hover:bg-nextgen-blue/10 transition-colors disabled:opacity-50"
              title={refreshing ? 'Refreshing...' : 'Refresh schedule'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
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

        {/* Export Actions */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Export volunteer schedule for {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleExportSchedule}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                Export as CSV
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleExportImage}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              >
                Export as Image
              </Button>
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
            <span>Has Volunteers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-nextgen-orange"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Sunday (Service Day)</span>
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
                      } ${day?.isPast && !day?.isToday ? 'opacity-60' : ''} ${
                        day?.isSunday ? 'bg-green-50' : ''
                      } transition-colors`}
                      onClick={() => day && handleDateClick(day)}
                      whileHover={day && day.events.length > 0 ? { 
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
                            {day.events.length > 0 && (
                              <Badge variant="primary" size="xs">
                                {day.events.length}
                              </Badge>
                            )}
                          </div>

                          {/* Event tags */}
                          <div className="flex-1 space-y-1 overflow-y-auto">
                            {day.events.slice(0, 3).map((event, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`flex items-center gap-1 p-1 rounded text-xs truncate hover:opacity-80 transition-colors ${
                                  event.serviceName === 'First Service' ? 'bg-purple-100 text-purple-700' :
                                  event.serviceName === 'Second Service' ? 'bg-blue-100 text-blue-700' :
                                  event.serviceName === 'Third Service' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <span className="font-medium truncate">
                                  {event.volunteerName}
                                </span>
                              </motion.div>
                            ))}
                            {day.events.length > 3 && (
                              <div className="text-[10px] text-gray-500 text-center py-1">
                                +{day.events.length - 3} more
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

      {/* Event Details Modal */}
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