import { useState, useRef, useEffect } from 'react';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

const FileUpload = ({
  category,
  onUploadComplete,
  onUploadError,
  onDeleteComplete,
  accept,
  maxSize,
  initialPreview,
  initialPath,
  previewClass,
  alt,
  className,
  mode = 'image' // 'image' or 'file'
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialPreview);
  const [imagePath, setImagePath] = useState(initialPath);
  const [fileName, setFileName] = useState('');
  const [captureMode, setCaptureMode] = useState('file'); // 'file' or 'camera'
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [stream, setStream] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const uploadFile = async (file) => {

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
      const url = await getDownloadURL(storageRef);
      
      setPreview(url);
      setImagePath(snapshot.ref.fullPath);
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

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      onUploadError(new Error(`File size must be less than ${maxSize}MB`));
      return;
    }

    await uploadFile(file);
  };

  const startCamera = async () => {
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Camera Access Denied',
        text: 'Please allow camera access to capture photos',
        confirmButtonColor: '#30CEE4'
      });
      setCaptureMode('file');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      setCaptureMode('file');
      await uploadFile(file);
    }, 'image/jpeg', 0.95);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (captureMode === 'camera') {
      await startCamera();
    }
  };

  useEffect(() => {
    if (captureMode === 'camera' && mode === 'image') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [captureMode, facingMode]);

  const handleDelete = async () => {
    try {
      // Use imagePath if available, otherwise try to extract from preview URL
      const pathToDelete = imagePath || preview;
      if (pathToDelete) {
        const imageRef = ref(storage, pathToDelete);
        await deleteObject(imageRef);
      }
      setPreview('');
      setImagePath('');
      setFileName('');
      onDeleteComplete();
    } catch (error) {
      console.error('Error deleting file:', error);
      // Still clear the preview even if deletion fails
      setPreview('');
      setImagePath('');
      setFileName('');
      onDeleteComplete();
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
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Mode selection buttons - only for images */}
            {mode === 'image' && (
              <div className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={() => setCaptureMode('file')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    captureMode === 'file'
                      ? 'bg-nextgen-blue text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload File
                  </div>
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setCaptureMode('camera')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    captureMode === 'camera'
                      ? 'bg-nextgen-blue text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </div>
                </motion.button>
              </div>
            )}

            {/* Camera view */}
            {captureMode === 'camera' && mode === 'image' ? (
              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg"
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    onClick={switchCamera}
                    className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {facingMode === 'user' ? 'Back Camera' : 'Front Camera'}
                    </div>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={capturePhoto}
                    disabled={uploading}
                    className="flex-1 py-2 px-4 bg-nextgen-blue hover:bg-nextgen-blue-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    whileHover={{ scale: uploading ? 1 : 1.02 }}
                    whileTap={{ scale: uploading ? 1 : 0.98 }}
                  >
                    {uploading ? 'Uploading...' : 'Capture Photo'}
                  </motion.button>
                </div>
              </div>
            ) : (
              /* File upload view */
              <motion.div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-nextgen-blue hover:bg-nextgen-blue/5 transition-colors duration-200"
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
