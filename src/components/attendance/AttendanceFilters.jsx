import React from 'react';
import { Input } from '../ui';

const AttendanceFilters = ({ 
  services, 
  selectedService, 
  setSelectedService, 
  selectedDate, 
  setSelectedDate 
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-1/2">
        <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
          Service
        </label>
        <div className="relative">
          <select
            id="service-select"
            value={selectedService || ''}
            onChange={(e) => setSelectedService(e.target.value)}
            className="block w-full h-11 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm appearance-none"
          >
            <option value="">Select Service</option>
            {services.map((service) => (
              <option key={service.service_id} value={service.service_id}>
                {service.service_name} ({service.day_of_week})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="w-full sm:w-1/2">
        <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <Input
          type="date"
          id="date-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-10"
          fullWidth
        />
      </div>
    </div>
  );
};

export default AttendanceFilters;