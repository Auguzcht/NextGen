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
  className
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialPreview);
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
      const storageRef = ref(storage, `${category}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setPreview(url);
      onUploadComplete({
        url,
        path: snapshot.ref.fullPath
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
      onDeleteComplete();
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {preview ? (
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
                  Click to upload photo
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
