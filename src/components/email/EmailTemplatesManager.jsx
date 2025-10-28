import { useState } from 'react';
import { Button, Badge, Modal } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import EmailTemplatesList from './EmailTemplatesList.jsx';
import EmailTemplateForm from './EmailTemplateForm.jsx';

const EmailTemplatesManager = ({ templates, onUpdate, loading }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleAdd = () => {
    setSelectedTemplate(null);
    setShowAddForm(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowEditForm(true);
  };

  const handleView = (template) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setSelectedTemplate(null);
  };

  const handleSuccess = () => {
    onUpdate();
  };

  const getTemplateTypeColor = (type) => {
    const colors = {
      'notification': 'primary',
      'welcome': 'success',
      'reminder': 'warning',
      'report': 'info',
      'announcement': 'secondary'
    };
    return colors[type] || 'secondary';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Email Templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage reusable email templates for guardians and staff
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="info" size="sm">
            {templates.length} Template{templates.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAdd}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Template
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
        </div>
      ) : (
        <EmailTemplatesList
          templates={templates}
          onRefresh={onUpdate}
          onView={handleView}
          onEdit={handleEdit}
        />
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <EmailTemplateForm
            onClose={handleCloseForm}
            onSuccess={handleSuccess}
            isEdit={false}
            initialData={null}
          />
        )}
      </AnimatePresence>

      {/* Edit Form */}
      <AnimatePresence>
        {showEditForm && selectedTemplate && (
          <EmailTemplateForm
            onClose={handleCloseForm}
            onSuccess={handleSuccess}
            isEdit={true}
            initialData={selectedTemplate}
          />
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && selectedTemplate && (
          <Modal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            title={selectedTemplate.template_name}
            size="large"
          >
            <div className="space-y-6">
              {/* Template Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant={getTemplateTypeColor(selectedTemplate.template_type)} size="sm">
                    {selectedTemplate.template_type}
                  </Badge>
                  <Badge variant={selectedTemplate.is_active ? "success" : "danger"} size="sm">
                    {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Last modified: {new Date(selectedTemplate.last_modified).toLocaleString()}
                </p>
              </div>

              {/* Subject */}
              <motion.div 
                className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="text-sm font-medium text-gray-700 mb-2">Subject Line</h4>
                <p className="text-base text-gray-900">{selectedTemplate.subject}</p>
              </motion.div>

              {/* HTML Content */}
              {selectedTemplate.body_html && (
                <motion.div 
                  className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <h4 className="text-sm font-medium text-gray-700 mb-2">HTML Content</h4>
                  <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                      {selectedTemplate.body_html || selectedTemplate.body}
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* Plain Text Content */}
              {selectedTemplate.body_text && (
                <motion.div 
                  className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Plain Text Content</h4>
                  <div className="bg-gray-50 rounded p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {selectedTemplate.body_text}
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* Preview Note */}
              <div className="bg-blue-50 border-l-4 border-nextgen-blue p-4 rounded-r-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-nextgen-blue-dark">
                      This is the raw template content. Dynamic values like {'{child_name}'} will be replaced when emails are sent.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedTemplate);
                  }}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                >
                  Edit Template
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmailTemplatesManager;
