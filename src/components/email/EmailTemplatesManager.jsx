import { useState } from 'react';
import supabase from '../../services/supabase.js';

const EmailTemplatesManager = ({ templates, onUpdate, loading }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editedTemplate, setEditedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editResult, setEditResult] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    subject: '',
    body_html: '',
    body_text: '',
    template_type: 'notification'
  });

  const handleSelectTemplate = (templateId) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setEditedTemplate(null);
      return;
    }

    const template = templates.find(t => t.template_id === parseInt(templateId));
    setSelectedTemplate(parseInt(templateId));
    setEditedTemplate(template);
    setIsEditing(false);
  };

  const handleEditTemplate = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset to the original template
    if (selectedTemplate) {
      const template = templates.find(t => t.template_id === selectedTemplate);
      setEditedTemplate(template);
    }
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedTemplate({
      ...editedTemplate,
      [name]: value
    });
  };

  const handleNewTemplateChange = (e) => {
    const { name, value } = e.target;
    setNewTemplate({
      ...newTemplate,
      [name]: value
    });
  };

  const handleSaveTemplate = async () => {
    if (!editedTemplate) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editedTemplate.subject,
          body_html: editedTemplate.body_html,
          body_text: editedTemplate.body_text,
          last_modified: new Date().toISOString()
        })
        .eq('template_id', editedTemplate.template_id);
      
      if (error) throw error;
      
      setEditResult({ success: true, message: 'Template saved successfully' });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      setEditResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setEditResult(null), 5000);
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    
    if (!newTemplate.template_name || !newTemplate.subject) {
      setEditResult({ success: false, message: 'Template name and subject are required' });
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert([{
          ...newTemplate,
          last_modified: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setEditResult({ success: true, message: 'Template added successfully' });
      setShowAddForm(false);
      setNewTemplate({
        template_name: '',
        subject: '',
        body_html: '',
        body_text: '',
        template_type: 'notification'
      });
      onUpdate();
    } catch (error) {
      setEditResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('template_id', selectedTemplate);
      
      if (error) throw error;
      
      setEditResult({ success: true, message: 'Template deleted successfully' });
      setSelectedTemplate(null);
      setEditedTemplate(null);
      onUpdate();
    } catch (error) {
      setEditResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-md">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Email Templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage templates for sending emails to guardians and staff
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Template
        </button>
      </div>
      
      {editResult && (
        <div className={`mx-6 mb-4 p-4 rounded-md ${editResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {editResult.message}
        </div>
      )}
      
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : showAddForm ? (
          <form onSubmit={handleAddTemplate} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label htmlFor="template_name" className="block text-sm font-medium text-gray-700">
                  Template Name
                </label>
                <input
                  type="text"
                  id="template_name"
                  name="template_name"
                  value={newTemplate.template_name}
                  onChange={handleNewTemplateChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="template_type" className="block text-sm font-medium text-gray-700">
                  Template Type
                </label>
                <select
                  id="template_type"
                  name="template_type"
                  value={newTemplate.template_type}
                  onChange={handleNewTemplateChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="notification">Notification</option>
                  <option value="welcome">Welcome</option>
                  <option value="reminder">Reminder</option>
                  <option value="report">Report</option>
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={newTemplate.subject}
                  onChange={handleNewTemplateChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="body_html" className="block text-sm font-medium text-gray-700">
                  HTML Content
                </label>
                <textarea
                  id="body_html"
                  name="body_html"
                  rows="8"
                  value={newTemplate.body_html}
                  onChange={handleNewTemplateChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="<p>Your HTML content here</p>"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="body_text" className="block text-sm font-medium text-gray-700">
                  Plain Text Content
                </label>
                <textarea
                  id="body_text"
                  name="body_text"
                  rows="5"
                  value={newTemplate.body_text}
                  onChange={handleNewTemplateChange}
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="Your text content here"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Add Template'}
              </button>
            </div>
          </form>
        ) : templates.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No email templates found. Create your first template to get started.
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-6">
              <label htmlFor="select-template" className="block text-sm font-medium text-gray-700 mr-3">
                Select Template:
              </label>
              <select
                id="select-template"
                value={selectedTemplate || ''}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">-- Select Template --</option>
                {templates.map((template) => (
                  <option key={template.template_id} value={template.template_id}>
                    {template.template_name} ({template.template_type})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedTemplate && editedTemplate && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium text-gray-900">
                    {editedTemplate.template_name}
                  </h4>
                  <div className="flex space-x-3">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveTemplate}
                          disabled={isSaving}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleEditTemplate}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteTemplate}
                          disabled={isSaving}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="view-subject" className="block text-sm font-medium text-gray-700">
                        Subject
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          id="view-subject"
                          name="subject"
                          value={editedTemplate.subject}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-800 p-2 bg-gray-50 rounded">
                          {editedTemplate.subject}
                        </div>
                      )}
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="view-html" className="block text-sm font-medium text-gray-700">
                        HTML Content
                      </label>
                      {isEditing ? (
                        <textarea
                          id="view-html"
                          name="body_html"
                          rows="8"
                          value={editedTemplate.body_html}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md font-mono"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-800 p-2 bg-gray-50 rounded">
                          <pre className="whitespace-pre-wrap">{editedTemplate.body_html}</pre>
                        </div>
                      )}
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="view-text" className="block text-sm font-medium text-gray-700">
                        Plain Text Content
                      </label>
                      {isEditing ? (
                        <textarea
                          id="view-text"
                          name="body_text"
                          rows="5"
                          value={editedTemplate.body_text}
                          onChange={handleInputChange}
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <div className="mt-1 text-sm text-gray-800 p-2 bg-gray-50 rounded">
                          <pre className="whitespace-pre-wrap">{editedTemplate.body_text}</pre>
                        </div>
                      )}
                    </div>
                    
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500">
                        Last modified: {new Date(editedTemplate.last_modified).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTemplatesManager;