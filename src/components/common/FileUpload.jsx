import { useState, useRef } from 'react';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({
  category,
  onUploadComplete,
  onUploadError,
  onDeleteComplete,
  accept,
  maxSize,
  initialPreview,
  previewClass,
  alt,
  className,
  mode = 'image' // 'image' or 'file'
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialPreview);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      onUploadError(new Error(`File size must be less than ${maxSize}MB`));
      return;
    }

    setUploading(true);
    try {
      // Add cache control metadata
      const storageRef = ref(storage, `${category}/${Date.now()}_${file.name}`);
      const metadata = {
        cacheControl: 'public,max-age=31536000', // Cache for 1 year
        contentType: file.type
      };
      
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snapshot.ref);
      
      setPreview(url);
      setFileName(file.name);
      onUploadComplete({
        url,
        path: snapshot.ref.fullPath,
        fileName: file.name
      });
    } catch (error) {
      onUploadError(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const imageRef = ref(storage, preview);
      await deleteObject(imageRef);
      setPreview('');
      setFileName('');
      onDeleteComplete();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getFileIcon = () => {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    // PDF
    if (extension === 'pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    // Word documents
    if (['doc', 'docx'].includes(extension)) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    // Excel/Sheets
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return (
        <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    }
    
    // Videos
    if (['mp4', 'mov', 'avi', 'wmv'].includes(extension)) {
      return (
        <svg className="w-8 h-8 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    }
    
    // Default file icon
    return (
      <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {preview ? (
          mode === 'image' ? (
            <motion.div
              key="preview"
              className="relative group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.img 
                src={preview} 
                alt={alt} 
                className={`${previewClass} transition-all duration-200 group-hover:brightness-75`}
                layoutId="uploadedImage"
              />
              <motion.button
                onClick={handleDelete}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="file-preview"
              className="relative group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    {getFileIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileName || 'File uploaded'}
                    </p>
                    <p className="text-xs text-gray-500">
                      File uploaded successfully
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <motion.button
                  onClick={handleDelete}
                  className="ml-3 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )
        ) : (
          <motion.div
            key="upload"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-nextgen-blue hover:bg-nextgen-blue/5 transition-colors duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleUpload}
              className="hidden"
            />
            {uploading ? (
              <div className="flex flex-col items-center">
                <motion.div 
                  className="w-10 h-10 border-4 border-gray-200 border-t-nextgen-blue rounded-full mb-2"
                  animate={{ rotate: 360 }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-nextgen-blue/10 rounded-full">
                  <svg 
                    className="w-6 h-6 text-nextgen-blue" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-nextgen-blue">
                  {mode === 'image' ? 'Click to upload photo' : 'Click to upload file'}
                </span>
                <span className="text-xs text-gray-500">
                  Maximum file size: {maxSize}MB
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
