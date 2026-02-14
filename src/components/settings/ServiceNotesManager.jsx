import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import ServiceNotesForm from './ServiceNotesForm.jsx';
import { Button, Table, Modal, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion } from 'framer-motion';
import { formatDate } from '../../utils/dateUtils.js';

const ServiceNotesManager = ({ services }) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  useEffect(() => {
    fetchServiceNotes();
  }, []);

  const fetchServiceNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_notes')
        .select(`
          *,
          services (service_name, day_of_week),
          staff (first_name, last_name)
        `)
        .order('service_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching service notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId) => {
    setNoteToDelete(noteId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;

    setShowDeleteDialog(false);
    
    try {
      const { error } = await supabase
        .from('service_notes')
        .delete()
        .eq('note_id', noteToDelete);

      if (error) throw error;
      
      toast.success('Service Note Deleted', {
        description: 'The service note has been successfully deleted.'
      });
      
      fetchServiceNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Deletion Failed', {
        description: 'Failed to delete service note. Please try again.'
      });
    } finally {
      setNoteToDelete(null);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md mt-6">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Service Notes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Record notes for services that have occurred with attendance
            </p>
          </div>
          <Button
            onClick={() => setShowNotesForm(true)}
            variant="primary"
            size="sm"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Service Note
          </Button>
        </div>

        {/* Custom Table - Matching StaffList Design */}
        <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Theme
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recorded By
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
                      <span className="ml-3 text-sm text-gray-500">Loading service notes...</span>
                    </div>
                  </td>
                </tr>
              ) : notes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm text-gray-500 font-medium">No service notes found</p>
                    <p className="text-xs text-gray-400 mt-1">Add notes for services that have occurred</p>
                  </td>
                </tr>
              ) : (
                notes.map((note) => (
                  <motion.tr 
                    key={note.note_id}
                    whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                    className="group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">
                          {formatDate(note.service_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{note.services?.service_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{note.services?.day_of_week || ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {note.theme || <span className="text-gray-400 italic">No theme</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="primary" size="sm">
                        {note.staff ? `${note.staff.first_name} ${note.staff.last_name}` : 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setSelectedNote(note)}
                          className="text-nextgen-blue"
                          icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          }
                        >
                          View
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => handleDelete(note.note_id)}
                          icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* View Note Details Modal */}
        {selectedNote && (
          <Modal
            isOpen={!!selectedNote}
            onClose={() => setSelectedNote(null)}
            title="Service Notes Details"
            size="3xl"
            variant="primary"
          >
            <motion.div 
              className="overflow-auto max-h-[70vh]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-4 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Service Information - Left Column */}
                <motion.div 
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div className="mb-4">
                    <h4 className="text-lg font-medium text-nextgen-blue-dark mb-2">Service Information</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Service</p>
                      <p className="mt-1 text-sm text-gray-900 font-medium">
                        {selectedNote.services?.service_name || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(selectedNote.service_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Day of Week</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedNote.services?.day_of_week || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Theme/Topic</p>
                      <p className="mt-1 text-sm text-gray-900 font-medium">
                        {selectedNote.theme || 'No theme specified'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Recorded By</p>
                      <div className="mt-1">
                        <Badge variant="primary" size="sm">
                          {selectedNote.staff 
                            ? `${selectedNote.staff.first_name} ${selectedNote.staff.last_name}` 
                            : 'Unknown Staff'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Notes Content - Right Column */}
                <div className="space-y-4 flex flex-col">
                  {/* Lesson Summary */}
                  <motion.div 
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Lesson Summary
                    </h4>
                    <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/30 rounded-lg p-3 border border-blue-100/50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedNote.lesson_summary || 'No lesson summary provided'}
                      </p>
                    </div>
                  </motion.div>

                  {/* Special Activities */}
                  <motion.div 
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-nextgen-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Special Activities
                    </h4>
                    <div className="bg-gradient-to-br from-orange-50/50 to-orange-50/30 rounded-lg p-3 border border-orange-100/50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedNote.special_activities || 'No special activities recorded'}
                      </p>
                    </div>
                  </motion.div>

                  {/* Issues Encountered */}
                  <motion.div 
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 }}
                  >
                    <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Issues & Challenges
                    </h4>
                    <div className="bg-gradient-to-br from-red-50/50 to-red-50/30 rounded-lg p-3 border border-red-100/50">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedNote.issues_encountered || 'No issues reported'}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </Modal>
        )}

        {/* Service Notes Form Modal */}
        {showNotesForm && (
          <ServiceNotesForm
            onClose={() => setShowNotesForm(false)}
            onSuccess={() => {
              setShowNotesForm(false);
              fetchServiceNotes();
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Service Note?</DialogTitle>
              <DialogDescription>
                <div className="space-y-3 text-left">
                  <p>
                    Are you sure you want to delete this service note? This action cannot be undone.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
              >
                Yes, Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ServiceNotesManager;