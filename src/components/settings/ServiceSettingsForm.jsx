import { useState } from 'react';
import supabase from '../../services/supabase.js';
import ServiceForm from './ServiceForm.jsx';
import { Button, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion } from 'framer-motion';

const ServiceSettingsForm = ({ services, onUpdate, loading }) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleEditService = (service) => {
    setSelectedService(service);
    setIsEditModalOpen(true);
  };

  const handleDeleteService = async (service) => {
    setServiceToDelete(service);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    const service = serviceToDelete;
    setShowDeleteDialog(false);
    setDeletingId(service.service_id);

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('service_id', service.service_id);
        
      if (error) throw error;
      
      toast.success('Service has been deleted', {
        description: 'Deleted!'
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(error.message || 'Failed to delete service', {
        description: 'Error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    onUpdate();
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedService(null);
    onUpdate();
  };

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Services</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage weekly service schedules and information
              </p>
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              variant="primary"
              size="sm"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Service
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No services found</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Service" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <motion.div
                  key={service.service_id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Simple Service Icon */}
                      <div className="h-12 w-12 rounded-lg bg-nextgen-blue/10 flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>

                      {/* Service Details */}
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-nextgen-blue-dark">{service.service_name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="primary" size="sm">
                            {service.day_of_week}
                          </Badge>
                          {service.start_time && service.end_time && (
                            <span className="text-sm text-gray-600 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {service.start_time} - {service.end_time}
                            </span>
                          )}
                          {service.location && (
                            <span className="text-sm text-gray-500 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {service.location}
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">{service.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleEditService(service)}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => handleDeleteService(service)}
                        disabled={deletingId === service.service_id}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <ServiceForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && selectedService && (
        <ServiceForm
          isEdit={true}
          initialData={selectedService}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedService(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {serviceToDelete && (
                <>
                  This will delete <strong>{serviceToDelete.service_name}</strong> and all
                  associated attendance records.
                  <br />
                  <br />
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Yes, delete it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceSettingsForm;