import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal, Alert } from '../ui';
import PropTypes from 'prop-types';
import QrScanner from 'qr-scanner';

const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [externalScanBuffer, setExternalScanBuffer] = useState('');
  const [processingExternalScan, setProcessingExternalScan] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [qrBoxSize, setQrBoxSize] = useState({ width: 0, height: 0 });
  const [hasProcessedScan, setHasProcessedScan] = useState(false);
  
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const externalBufferTimeoutRef = useRef(null);
  const modalContentRef = useRef(null);
  
  // Calculate scanner box dimensions based on container size
  useEffect(() => {
    if (videoContainerRef.current && scanning) {
      const containerWidth = videoContainerRef.current.clientWidth;
      const containerHeight = videoContainerRef.current.clientHeight;
      
      // Make the scanning area 75% of the container size
      const size = Math.min(containerWidth, containerHeight) * 0.75;
      setQrBoxSize({
        width: size,
        height: size
      });
    }
  }, [scanning, isOpen]);
  
  // Listen for external scanner input (keyboard events)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      // Process only when modal is open
      if (!isOpen || hasProcessedScan) return;
      
      // If Enter is pressed or we receive a sufficient number of characters, process the buffer
      if ((e.key === 'Enter' || e.key === 'Tab') && externalScanBuffer) {
        e.preventDefault(); // Prevent form submission
        processExternalScan();
        return;
      }
      
      // If it's a printable character, add to buffer
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setExternalScanBuffer(prev => prev + e.key);
        
        // Clear any existing timeout
        if (externalBufferTimeoutRef.current) {
          clearTimeout(externalBufferTimeoutRef.current);
        }
        
        // If we've accumulated characters, it's likely a scan in progress
        // Most USB scanners will finish sending characters within 100-200ms
        externalBufferTimeoutRef.current = setTimeout(() => {
          if (externalScanBuffer.length > 3) {
            processExternalScan();
          }
        }, 200);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (externalBufferTimeoutRef.current) {
        clearTimeout(externalBufferTimeoutRef.current);
      }
    };
  }, [isOpen, externalScanBuffer, hasProcessedScan]);
  
  // Process external scanner input
  const processExternalScan = () => {
    if (processingExternalScan || !externalScanBuffer || hasProcessedScan) return;
    
    try {
      setProcessingExternalScan(true);
      setHasProcessedScan(true);
      
      // Show animation
      setShowSuccessAnimation(true);
      
      // Process the scanned code
      const scanValue = externalScanBuffer.trim();
      
      // Show success message with a delay for the animation
      setTimeout(() => {
        handleScanResult(scanValue);
        // Clear the buffer
        setExternalScanBuffer('');
      }, 700);
    } catch (error) {
      console.error('Error processing external scan:', error);
      setError('Failed to process the scanned code');
      setExternalScanBuffer('');
    } finally {
      setProcessingExternalScan(false);
    }
  };
  
  // Start webcam scanning
  const startScanning = async () => {
    try {
      setScanning(true);
      setError(null);
      setSuccess(null);
      setShowSuccessAnimation(false);
      setHasProcessedScan(false);
      
      if (!videoRef.current) return;
      
      // Create QR scanner instance if it doesn't exist
      if (!qrScannerRef.current) {
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          result => {
            // Only process if we haven't already processed a scan
            if (hasProcessedScan) return;
            
            console.log("QR code detected:", result);
            
            // Mark as processed to prevent multiple scans
            setHasProcessedScan(true);
            
            // Show success animation
            setShowSuccessAnimation(true);
            
            // Process the QR code after a brief delay for animation
            setTimeout(() => {
              handleScanResult(result.data);
            }, 700);
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 3, // Reduce scan rate to prevent multiple detections
            preferredCamera: 'environment', // Use back camera by default
          }
        );
      }
      
      // Start the scanner
      await qrScannerRef.current.start();
      
      // Log available cameras for debugging
      QrScanner.listCameras().then(cameras => {
        console.log('Available cameras:', cameras);
      });
      
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setError(`Camera access error: ${err.message}`);
      setScanning(false);
    }
  };
  
  // Stop webcam scanning
  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setScanning(false);
  };

  // Toggle camera between front and back
  const toggleCamera = async () => {
    try {
      if (!qrScannerRef.current) return;
      
      // Get available cameras
      const cameras = await QrScanner.listCameras();
      if (cameras.length < 2) {
        setError('Only one camera is available');
        return;
      }
      
      // Find the current camera ID
      const currentCamera = await qrScannerRef.current.getCamera();
      
      // Find the next camera in the list
      const currentIndex = cameras.findIndex(camera => camera.id === currentCamera.id);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      
      // Switch to the next camera
      await qrScannerRef.current.setCamera(nextCamera.id);
      
    } catch (err) {
      console.error('Error switching camera:', err);
      setError(`Failed to switch camera: ${err.message}`);
    }
  };
  
  // Handle successful scan (from either method)
  const handleScanResult = (result) => {
    // Stop scanning
    stopScanning();
    
    // Show success message
    setSuccess(`QR Code detected: ${result}`);
    
    // Call the onScanSuccess callback with the result
    onScanSuccess(result);
    
    // Auto close after success (with slight delay for animation)
    setTimeout(() => {
      onClose();
    }, 1000);
  };
  
  // Clean up when modal closes or component unmounts
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      setExternalScanBuffer('');
      setError(null);
      setSuccess(null);
      setShowSuccessAnimation(false);
      setHasProcessedScan(false);
    }
    
    // Clean up resources when component unmounts
    return () => {
      stopScanning();
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      if (externalBufferTimeoutRef.current) {
        clearTimeout(externalBufferTimeoutRef.current);
      }
    };
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan QR Code"
      size="md"
      variant="primary"
      closeButton={true}
    >
      <div className="p-5 relative" ref={modalContentRef}>
        {/* Success animation overlay - positioned only over the modal content */}
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div 
              className="absolute inset-0 z-30 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15 }}
              >
                <motion.svg 
                  className="w-14 h-14 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="3" 
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Instructions */}
        <div className="text-center mb-4">
          <p className="text-gray-600">
            Scan a child's QR code using your device camera or a handheld scanner.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Position the QR code within the scanning area.
          </p>
        </div>
        
        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            </motion.div>
          )}
          
          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Alert variant="success">
                {success}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Camera Preview Area */}
        <div 
          ref={videoContainerRef}
          className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 max-w-sm mx-auto"
        >
          <video 
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline 
            muted
          />
          
          {scanning && (
            <>
              {/* Camera switch button */}
              <button
                onClick={toggleCamera}
                className="absolute top-3 right-3 bg-nextgen-blue hover:bg-nextgen-blue-dark text-white px-3 py-2 rounded-lg shadow-lg transition-all z-20 flex items-center gap-2"
                type="button"
                aria-label="Switch camera"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Switch Camera</span>
              </button>
              
              {/* Scanner status indicator */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                <div className="bg-black/50 text-white text-xs py-1 px-3 rounded-full flex items-center">
                  <motion.div 
                    className="w-2 h-2 bg-nextgen-blue rounded-full mr-2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  Scanning...
                </div>
              </div>
            </>
          )}
          
          {!scanning && !success && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-nextgen-blue/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-center">Camera preview will appear here</p>
              <p className="text-sm mt-2">Click "Start Camera" to begin scanning</p>
            </div>
          )}
        </div>

        {/* External scanner info */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            External barcode scanners are supported and working
          </div>
        </div>

        {/* Action Buttons - Fixed layout */}
        <div className="flex justify-end items-center mt-4 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="whitespace-nowrap"
          >
            Close
          </Button>
          
          {!success && !showSuccessAnimation && (
            <Button
              variant={scanning ? "danger" : "primary"}
              onClick={scanning ? stopScanning : startScanning}
              disabled={showSuccessAnimation}
              className="whitespace-nowrap"
              icon={
                scanning ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )
              }
              iconPosition="left"
            >
              {scanning ? "Stop Camera" : "Start Camera"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

QRScannerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onScanSuccess: PropTypes.func.isRequired
};

export default QRScannerModal;