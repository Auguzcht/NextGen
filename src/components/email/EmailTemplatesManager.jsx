import { useState } from 'react';
import { Button, Badge } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import EmailTemplatesList from './EmailTemplatesList.jsx';
import EmailTemplateForm from './EmailTemplateForm.jsx';

const EmailTemplatesManager = ({ templates, onUpdate, loading }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const handleAdd = () => {
    setSelectedTemplate(null);
    setShowAddForm(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowEditForm(true);
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


    </div>
  );
};

export default EmailTemplatesManager;
