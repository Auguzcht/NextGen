import { useState } from 'react';
import supabase from '../../services/supabase.js';
import { Button, Badge } from '../ui';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

const EmailTemplatesList = ({ templates, onRefresh, onView, onEdit }) => {
  const [updatingId, setUpdatingId] = useState(null);

  const toggleActiveStatus = async (templateId, currentStatus) => {
    setUpdatingId(templateId);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ 
          is_active: !currentStatus,
          last_modified: new Date().toISOString()
        })
        .eq('template_id', templateId);

      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating template status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Error updating template status: ${error.message}`
      });
    } finally {
      setUpdatingId(null);
    }
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

  const getTemplateIcon = (type) => {
    const iconMap = {
      'notification': (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      'welcome': (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      ),
      'reminder': (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'report': (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'announcement': (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      )
    };
    
    return iconMap[type] || (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Template Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subject
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {templates.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-6 py-12 text-center">
                <div className="flex flex-col items-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new template.</p>
                </div>
              </td>
            </tr>
          ) : (
            templates.map((template) => (
              <motion.tr 
                key={template.template_id} 
                whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                className="group"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-nextgen-blue/10 text-nextgen-blue mr-3">
                      {getTemplateIcon(template.template_type)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {template.template_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(template.last_modified).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-xs" title={template.subject}>
                    {template.subject}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    variant={getTemplateTypeColor(template.template_type)} 
                    size="sm"
                  >
                    {template.template_type}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-32">
                  <Badge 
                    variant={template.is_active ? "success" : "danger"} 
                    size="sm"
                    className="w-full justify-center"
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onView(template)}
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
                      variant="ghost"
                      size="xs"
                      onClick={() => onEdit(template)}
                      className="text-nextgen-blue"
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant={template.is_active ? "danger" : "success"}
                      size="xs"
                      onClick={() => toggleActiveStatus(template.template_id, template.is_active)}
                      disabled={updatingId === template.template_id}
                      isLoading={updatingId === template.template_id}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EmailTemplatesList;

