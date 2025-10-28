import { useState } from 'react';
import StaffAssignmentsList from '../components/staff/StaffAssignmentsList.jsx';
import StaffAssignmentForm from '../components/staff/StaffAssignmentForm.jsx';
import StaffScheduleCalendar from '../components/staff/StaffScheduleCalendar.jsx';
import { Card, Button } from '../components/ui';
import { motion } from 'framer-motion';

const StaffAssignmentsPage = () => {
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAssignmentSuccess = () => {
    setIsAssignmentModalOpen(false);
    setRefreshKey(prev => prev + 1); // Trigger refresh
  };

  return (
    <div className="page-container">
      <Card
        variant="default"
        title="Staff Assignments"
        titleColor="text-nextgen-blue-dark"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      >
        {/* Schedule Calendar */}
        <StaffScheduleCalendar key={refreshKey} />

        {/* Assignment List */}
        <div className="mt-8">
          <StaffAssignmentsList 
            key={refreshKey}
            onAddClick={() => setIsAssignmentModalOpen(true)}
          />
        </div>
      </Card>

      {/* Staff Assignment Modal */}
      {isAssignmentModalOpen && (
        <StaffAssignmentForm
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  );
};

export default StaffAssignmentsPage;