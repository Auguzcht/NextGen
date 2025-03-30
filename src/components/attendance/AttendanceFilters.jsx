import React from 'react';

const AttendanceFilters = ({ 
  services, 
  selectedService, 
  setSelectedService, 
  selectedDate, 
  setSelectedDate 
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div>
        <label htmlFor="service-select" className="block text-sm font-medium text-gray-700 mb-1">
          Service
        </label>
        <select
          id="service-select"
          value={selectedService || ''}
          onChange={(e) => setSelectedService(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Select Service</option>
          {services.map((service) => (
            <option key={service.service_id} value={service.service_id}>
              {service.service_name} ({service.day_of_week})
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          id="date-select"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
    </div>
  );
};

export default AttendanceFilters;