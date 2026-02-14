import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import supabase from '../../services/supabase.js';
import googleDrive from '../../services/googleDrive.js';
import FileUpload, { MultiFileUpload } from '../common/FileUpload.jsx';
import { Input, Button, Badge, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import { motion } from 'framer-motion';

const MaterialForm = ({ onClose, onSuccess, isEdit = false, initialData = null, ageCategories = [] }) => {
  const { toast } = useToast();
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [formData, setFormData] = useState(() => {
    if (isEdit && initialData) {
      return {
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || 'Lesson',
        category_id: initialData.category_id || '',
        file_url: initialData.file_url || '',
        link_type: initialData.link_type || 'upload'
      };
    }
    
    return {
      title: '',
      description: '',
      category: 'Lesson',
      category_id: '',
      file_url: '',
      link_type: 'upload'
    };
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadMethod, setUploadMethod] = useState(() => {
    if (isEdit && initialData?.link_type) {
      return initialData.link_type;
    }
    return 'upload';
  });
  const [externalLink, setExternalLink] = useState(() => {
    if (isEdit && initialData?.link_type === 'external' && initialData?.file_url) {
      return initialData.file_url;
    }
    return '';
  });
  
  // Temporary file staging (like git staging)
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [existingFiles, setExistingFiles] = useState([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Load existing files when editing
  useEffect(() => {
    if (isEdit && initialData?.file_url && uploadMethod === 'upload') {
      // Parse file_url - could be single file or multiple files stored as JSON
      try {
        let files = [];
        if (initialData.file_url.startsWith('[')) {
          // Multiple files stored as JSON array
          files = JSON.parse(initialData.file_url);
        } else {
          // Single file URL
          const fileName = initialData.file_url.split('/').pop().split('?')[0] || 'file';
          files = [{
            url: initialData.file_url,
            fileName: fileName,
            existing: true
          }];
        }
        setExistingFiles(files);
      } catch (error) {
        console.error('Error parsing existing files:', error);
        // Fallback to treating as single URL
        if (initialData.file_url) {
          const fileName = initialData.file_url.split('/').pop().split('?')[0] || 'file';
          setExistingFiles([{
            url: initialData.file_url,
            fileName: fileName,
            existing: true
          }]);
        }
      }
    }
  }, [isEdit, initialData, uploadMethod]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Convert category_id to integer or null
    const processedValue = name === 'category_id' 
      ? (value === '' ? '' : parseInt(value, 10))
      : value;
    
    setFormData({
      ...formData,
      [name]: processedValue
    });
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    
    // Validate external link if method is external
    if (uploadMethod === 'external') {
      if (!externalLink.trim()) {
        newErrors.externalLink = 'Link URL is required';
      } else if (!isValidUrl(externalLink)) {
        newErrors.externalLink = 'Please enter a valid URL (e.g., https://drive.google.com/...)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle file staging (temporary upload to Firebase for preview)
  const handleFileStaged = (fileData) => {
    setStagedFiles(prev => [...prev, {
      url: fileData.url,
      path: fileData.path,
      fileName: fileData.fileName,
      timestamp: Date.now()
    }]);
  };

  // Handle multiple files staging
  const handleMultipleFilesStaged = (filesData) => {
    const newFiles = filesData.map(fileData => ({
      url: fileData.url,
      path: fileData.path,
      fileName: fileData.fileName,
      timestamp: Date.now() + Math.random() // Ensure unique timestamps
    }));
    setStagedFiles(prev => [...prev, ...newFiles]);
  };

  // Remove staged file
  const handleRemoveStagedFile = (index) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all staged files
  const handleClearStagedFiles = () => {
    setStagedFiles([]);
  };

  const handleClose = () => {
    const hasData = formData.title.trim() !== '' || 
                   formData.description.trim() !== '';
    
    // Only prompt if there's data AND it's not editing an existing material
    if (hasData && !isEdit) {
      setShowDiscardDialog(true);
      return; // Don't close yet - wait for user response
    }
    
    // Close directly if no data or editing existing
    onClose();
  };

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please check all required fields', {
        description: 'Validation Error'
      });
      return;
    }
    
    setIsSaving(true);
    setIsUploading(true);
    
    try {
      let finalFileUrl = null;
      
      // If upload method and we have staged files, upload them to Google Drive
      if (uploadMethod === 'upload' && stagedFiles.length > 0) {
        // Create folder name from material title
        const folderName = formData.title.trim();

        // Create the folder first (only once for all files)
        const folder = await googleDrive.createFolder(folderName);
        const folderId = folder.id;

        // Upload all files to the same folder
        const uploadPromises = stagedFiles.map(async (file) => {
          try {
            // Fetch the file from Firebase Storage URL
            const response = await fetch(file.url);
            const blob = await response.blob();
            const fileObj = new File([blob], file.fileName, { type: blob.type });
            
            // Upload to Google Drive directly to the folder (no folderName, use parentFolderId)
            const result = await googleDrive.uploadFile(fileObj, {
              name: file.fileName,
              parentFolderId: folderId,
              description: `${formData.category} - ${formData.description || 'Material for NextGen Ministry'}`
            });
            
            return result;
          } catch (error) {
            console.error(`Failed to upload ${file.fileName}:`, error);
            throw error;
          }
        });

        await Promise.all(uploadPromises);
        
        // Store the folder URL (all files are in this one folder)
        finalFileUrl = `https://drive.google.com/drive/folders/${folderId}`;
      } else if (uploadMethod === 'upload' && existingFiles.length > 0 && stagedFiles.length === 0) {
        // Keep existing files if no new files uploaded
        finalFileUrl = formData.file_url;
      } else if (uploadMethod === 'external') {
        finalFileUrl = externalLink.trim();
      }

      const materialData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        file_url: finalFileUrl,
        link_type: uploadMethod,
        is_active: true
      };

      if (isEdit && initialData?.material_id) {
        // Update existing material
        const { error } = await supabase
          .from('materials')
          .update(materialData)
          .eq('material_id', initialData.material_id);
        
        if (error) throw error;
        
        toast.success('Material has been updated successfully', {
          description: 'Updated!'
        });
      } else {
        // Create new material
        const { error } = await supabase
          .from('materials')
          .insert([materialData]);
        
        if (error) throw error;
        
        toast.success(`Material "${formData.title}" has been added successfully`, {
          description: 'Added!'
        });
      }
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving material:', error);
      toast.error(error.message || 'Failed to save material', {
        description: 'Error'
      });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const categoryOptions = [
    { value: 'Lesson', label: 'Lesson' },
    { value: 'Activity', label: 'Activity' },
    { value: 'Song', label: 'Song' },
    { value: 'Craft', label: 'Craft' },
    { value: 'Video', label: 'Video' },
    { value: 'Story', label: 'Story' },
    { value: 'Game', label: 'Game' }
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-nextgen-blue-dark">
            {isEdit ? 'Edit Material' : 'Add New Material'}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
            type="button"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-6 rounded-r-md backdrop-blur-sm shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-nextgen-blue-dark font-medium">
                  {isEdit 
                    ? 'Update material information and file'
                    : 'Add a new educational material with optional file attachment'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Upload/Link Section */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Material Files
              </h3>
              
              {/* Upload Method Toggle - Only show when NOT editing */}
              {!isEdit && (
                <div className="flex gap-3 mb-6">
                  <Button
                    type="button"
                    onClick={() => {
                      setUploadMethod('upload');
                      setExternalLink('');
                      if (errors.externalLink) {
                        setErrors({...errors, externalLink: null});
                      }
                    }}
                    variant={uploadMethod === 'upload' ? 'primary' : 'outline'}
                    className="flex-1"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    }
                  >
                    Upload Files
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setUploadMethod('external');
                      handleClearStagedFiles();
                    }}
                    variant={uploadMethod === 'external' ? 'primary' : 'outline'}
                    className="flex-1"
                    icon={
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    }
                  >
                    Attach External Link
                  </Button>
                </div>
              )}

              {/* Upload Method Content */}
              {uploadMethod === 'upload' ? (
                <div className="space-y-4">
                  {/* Existing Files Display (when editing) */}
                  {isEdit && existingFiles.length > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                          <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                        </svg>
                        <span className="text-sm font-semibold text-green-900">
                          Current Files ({existingFiles.length})
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {existingFiles.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm font-medium text-gray-900 truncate flex-1">{file.fileName}</p>
                            </div>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-green-700 mt-2">
                        Upload new files below to replace these files
                      </p>
                    </div>
                  )}

                  {/* File Upload Component - Always Visible */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isEdit && existingFiles.length > 0 ? 'Add New Files' : 'Add Files'}
                    </label>
                    <MultiFileUpload
                      key={stagedFiles.length} // Force re-render to clear preview
                      category="materials-staging"
                      onUploadComplete={(filesData) => {
                        handleMultipleFilesStaged(filesData);
                      }}
                      onUploadError={(error) => {
                        toast.error(error.message, {
                          description: 'Upload Error'
                        });
                      }}
                      accept="*/*"
                      maxSize={100}
                      className="w-full"
                    />
                  </div>

                  {/* Staged Files Display */}
                  {stagedFiles.length > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                          </svg>
                          <span className="text-sm font-semibold text-blue-900">
                            Staged Files ({stagedFiles.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearStagedFiles}
                          className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {stagedFiles.map((file, index) => (
                          <div 
                            key={file.timestamp} 
                            className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                              <p className="text-sm font-medium text-gray-900 truncate flex-1">{file.fileName}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedFile(index)}
                              className="ml-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="External Link URL *"
                    name="externalLink"
                    value={externalLink}
                    onChange={(e) => {
                      setExternalLink(e.target.value);
                      if (errors.externalLink) {
                        setErrors({...errors, externalLink: null});
                      }
                    }}
                    error={errors.externalLink}
                    placeholder="https://drive.google.com/drive/folders/..."
                    helperText="Paste your Google Drive folder link, Dropbox link, or any external resource URL"
                  />
                  
                  {/* Preview external link */}
                  {externalLink && isValidUrl(externalLink) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-800 mb-1">Valid URL</p>
                          <a 
                            href={externalLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-green-700 hover:text-green-900 underline break-all"
                          >
                            {externalLink}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-3">
                    <div className="flex">
                      <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="text-xs text-yellow-700">
                        <p className="font-medium mb-1">Google Drive Tips:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Make sure the link is set to "Anyone with the link can view"</li>
                          <li>For folders, copy the share link directly from Google Drive</li>
                          <li>For single files, you can use the file's share link</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Material Information Section */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Material Information
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Title *"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  error={errors.title}
                  placeholder="e.g., The Good Samaritan Lesson"
                  required
                />

                <Input
                  type="textarea"
                  label="Description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the material and how to use it"
                />
              </div>
            </motion.div>

            {/* Category and Age Group Section */}
            <motion.div 
              className="bg-white rounded-lg border border-[#571C1F]/10 p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                Category & Age Group
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Material Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
                    required
                  >
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Target Age Group
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
                  >
                    <option value="">All Ages</option>
                    {ageCategories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave as "All Ages" if suitable for all age groups
                  </p>
                </div>
              </div>
            </motion.div>
          </form>
        </div>

        {/* Form Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading to Google Drive...
                    </>
                  ) : (
                    isEdit ? 'Saving Changes...' : 'Adding Material...'
                  )}
                </span>
              ) : (
                isEdit ? 'Save Changes' : 'Add Material'
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Discard Changes Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
            <DialogDescription>
              Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDiscardDialog(false)}>
              No, keep editing
            </Button>
            <Button variant="danger" onClick={confirmDiscard}>
              Yes, discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MaterialForm;

