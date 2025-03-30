import { useState } from 'react';
import supabase from '../../services/supabase.js';

const ServiceSettingsForm = ({ services, onUpdate, loading }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [newService, setNewService] = useState({
    service_name: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    location: '',
    description: ''
  });
  const [editingService, setEditingService] = useState(null);

  const handleAddService = async (e) => {
    e.preventDefault();
    
    if (!newService.service_name || !newService.day_of_week) {
      alert('Service name and day of week are required');
      return;
    }
    
    setSavingId('new');
    try {
      const { error } = await supabase
        .from('services')
        .insert([newService]);
        
      if (error) throw error;
      
      setNewService({
        service_name: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
        location: '',
        description: ''
      });
      setIsAdding(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding service:', error);
      alert(`Error adding service: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateService = async (service) => {
    setSavingId(service.service_id);
    try {
      const { error } = await supabase
        .from('services')
        .update(service)
        .eq('service_id', service.service_id);
        
      if (error) throw error;
      
      setEditingService(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating service:', error);
      alert(`Error updating service: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service? This will also delete all associated attendance records.')) {
      return;
    }
    
    setSavingId(serviceId);
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('service_id', serviceId);
        
      if (error) throw error;
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting service:', error);
      alert(`Error deleting service: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const toggleEdit = (service) => {
    if (editingService && editingService.service_id === service.service_id) {
      setEditingService(null);
    } else {
      setEditingService({...service});
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Services</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            {isAdding ? 'Cancel' : 'Add Service'}
          </button>
        </div>
        
        {isAdding && (
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <form onSubmit={handleAddService}>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="service_name" className="block text-sm font-medium text-gray-700">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    name="service_name"
                    id="service_name"
                    value={newService.service_name}
                    onChange={(e) => setNewService({...newService, service_name: e.target.value})}
                    required
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
                    Day of Week *
                  </label>
                  <select
                    id="day_of_week"
                    name="day_of_week"
                    value={newService.day_of_week}
                    onChange={(e) => setNewService({...newService, day_of_week: e.target.value})}
                    required
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a day</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    id="start_time"
                    value={newService.start_time}
                    onChange={(e) => setNewService({...newService, start_time: e.target.value})}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    id="end_time"
                    value={newService.end_time}
                    onChange={(e) => setNewService({...newService, end_time: e.target.value})}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-6">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={newService.location}
                    onChange={(e) => setNewService({...newService, location: e.target.value})}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="mt-5 text-right">
                <button
                  type="submit"
                  disabled={savingId === 'new'}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {savingId === 'new' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Add Service'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>No services found. Add a service to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {services.map((service) => (
              <li key={service.service_id} className="py-4">
                {editingService && editingService.service_id === service.service_id ? (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-3">
                        <label htmlFor={`edit_name_${service.service_id}`} className="block text-sm font-medium text-gray-700">
                          Service Name
                        </label>
                        <input
                          type="text"
                          id={`edit_name_${service.service_id}`}
                          value={editingService.service_name}
                          onChange={(e) => setEditingService({...editingService, service_name: e.target.value})}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="sm:col-span-3">
                        <label htmlFor={`edit_day_${service.service_id}`} className="block text-sm font-medium text-gray-700">
                          Day of Week
                        </label>
                        <select
                          id={`edit_day_${service.service_id}`}
                          value={editingService.day_of_week}
                          onChange={(e) => setEditingService({...editingService, day_of_week: e.target.value})}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="">Select a day</option>
                          <option value="Sunday">Sunday</option>
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                        </select>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label htmlFor={`edit_start_${service.service_id}`} className="block text-sm font-medium text-gray-700">
                          Start Time
                        </label>
                        <input
                          type="time"
                          id={`edit_start_${service.service_id}`}
                          value={editingService.start_time || ''}
                          onChange={(e) => setEditingService({...editingService, start_time: e.target.value})}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label htmlFor={`edit_end_${service.service_id}`} className="block text-sm font-medium text-gray-700">
                          End Time
                        </label>
                        <input
                          type="time"
                          id={`edit_end_${service.service_id}`}
                          value={editingService.end_time || ''}
                          onChange={(e) => setEditingService({...editingService, end_time: e.target.value})}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label htmlFor={`edit_location_${service.service_id}`} className="block text-sm font-medium text-gray-700">
                          Location
                        </label>
                        <input
                          type="text"
                          id={`edit_location_${service.service_id}`}
                          value={editingService.location || ''}
                          onChange={(e) => setEditingService({...editingService, location: e.target.value})}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="sm:col-span-6">
                        <label htmlFor={`edit_desc_${service.service_id}`} className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id={`edit_desc_${service.service_id}`}
                          rows={2}
                          value={editingService.description || ''}
                          onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                          className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => toggleEdit(service)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateService(editingService)}
                        disabled={savingId === service.service_id}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {savingId === service.service_id ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-lg">{service.service_name}</h4>
                      <p className="text-gray-500">
                        {service.day_of_week}
                        {service.start_time && service.end_time && ` • ${service.start_time} - ${service.end_time}`}
                        {service.location && ` • ${service.location}`}
                      </p>
                      {service.description && (
                        <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => toggleEdit(service)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.service_id)}
                        disabled={savingId === service.service_id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {savingId === service.service_id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ServiceSettingsForm;