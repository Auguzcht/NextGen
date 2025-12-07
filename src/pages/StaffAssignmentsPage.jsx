import { useState } from 'react';
import StaffScheduleCalendar from '../components/staff/StaffScheduleCalendar.jsx';
import { Card } from '../components/ui';

const StaffAssignmentsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="page-container">
      <Card
        variant="default"
        title="Volunteer Schedule"
        titleColor="text-nextgen-blue-dark"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      >
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Real-time Zoho Calendar Integration</h4>
              <p className="text-sm text-blue-800">
                This calendar displays live volunteer schedules from Zoho Calendar. Volunteers book their slots via Cal.com, 
                which automatically syncs to the NXTGen Volunteer Schedule calendar. Export schedules as CSV to share with your GCs.
              </p>
            </div>
          </div>
        </div>

        {/* Schedule Calendar */}
        <StaffScheduleCalendar key={refreshKey} />
      </Card>
    </div>
  );
};

export default StaffAssignmentsPage;