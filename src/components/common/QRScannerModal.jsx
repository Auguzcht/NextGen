import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal, AlertNew, AlertTitle, AlertDescription } from '../ui';
import PropTypes from 'prop-types';
import QrScanner from 'qr-scanner';

const CAMERA_BARCODE_FORMATS = ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar'];

const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [error, setError] = useState(null);
  const [externalScanBuffer, setExternalScanBuffer] = useState('');
  const [processingExternalScan, setProcessingExternalScan] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [qrBoxSize, setQrBoxSize] = useState({ width: 0, height: 0 });
  const [hasProcessedScan, setHasProcessedScan] = useState(false);
  const [scannedChildInfo, setScannedChildInfo] = useState(null);
  const [showChildInfo, setShowChildInfo] = useState(false);
  const [barcodeCameraSupported, setBarcodeCameraSupported] = useState(false);
  
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const barcodeScanRafRef = useRef(null);
  const videoContainerRef = useRef(null);
  const externalBufferTimeoutRef = useRef(null);
  const modalContentRef = useRef(null);
  const processingRef = useRef(false); // Synchronous processing flag
  const scanningRef = useRef(false);
  const hasProcessedRef = useRef(false);
  const lastScanRef = useRef({ value: '', timestamp: 0 }); // Track last scan to prevent duplicates
  const barcodeLastDetectAtRef = useRef(0);

  // Non-invasive tuning layer: adapt rates and delays by device capability.
  const scanTuning = useMemo(() => {
    const defaults = {
      profileName: 'default',
      maxScansPerSecond: 3,
      barcodeDetectIntervalMs: 60,
      startUiDelayMs: 180,
      stabilizeDelayMs: 100,
      stopUiDelayMs: 120,
      highlightScanRegion: true,
      highlightCodeOutline: true,
    };

    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return defaults;
    }

    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const cpuCores = navigator.hardwareConcurrency || 4;
    const memoryGb = navigator.deviceMemory || 4;
    const isLowPowerDevice = cpuCores <= 4 || memoryGb <= 4;

    if (isLowPowerDevice) {
      return {
        profileName: 'conservative',
        maxScansPerSecond: 2,
        barcodeDetectIntervalMs: 140,
        startUiDelayMs: 220,
        stabilizeDelayMs: 140,
        stopUiDelayMs: 120,
        highlightScanRegion: false,
        highlightCodeOutline: false,
      };
    }

    if (isMobile) {
      return {
        profileName: 'mobile',
        maxScansPerSecond: 2.5,
        barcodeDetectIntervalMs: 90,
        startUiDelayMs: 200,
        stabilizeDelayMs: 120,
        stopUiDelayMs: 120,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      };
    }

    return defaults;
  }, []);

  useEffect(() => {
    // console.log('QR scan tuning profile:', scanTuning.profileName, scanTuning);
  }, [scanTuning]);

  const handleDetectedScan = (scanValue, source) => {
    if (!scanValue || processingRef.current || hasProcessedRef.current) return;

    processingRef.current = true;
    hasProcessedRef.current = true;
    setHasProcessedScan(true);
    stopScanning();

    const now = Date.now();
    if (lastScanRef.current.value === scanValue && (now - lastScanRef.current.timestamp) < 2000) {
      processingRef.current = false;
      return;
    }

    lastScanRef.current = { value: scanValue, timestamp: now };

    setTimeout(() => {
      handleScanResult(scanValue, source);
    }, 700);
  };

  const stopBarcodeLoop = () => {
    if (barcodeScanRafRef.current) {
      cancelAnimationFrame(barcodeScanRafRef.current);
      barcodeScanRafRef.current = null;
    }
  };

  const startBarcodeLoop = () => {
    if (!barcodeDetectorRef.current || !videoRef.current) return;

    const scanFrame = async () => {
      if (!scanningRef.current || processingRef.current || hasProcessedRef.current || !videoRef.current) {
        stopBarcodeLoop();
        return;
      }

      try {
        const now = performance.now();
        if (now - barcodeLastDetectAtRef.current < scanTuning.barcodeDetectIntervalMs) {
          barcodeScanRafRef.current = requestAnimationFrame(scanFrame);
          return;
        }
        barcodeLastDetectAtRef.current = now;

        if (videoRef.current.readyState >= 2) {
          const detected = await barcodeDetectorRef.current.detect(videoRef.current);
          if (detected?.length) {
            const raw = (detected[0].rawValue || '').trim();
            if (raw) {
              handleDetectedScan(raw, 'barcode-camera');
              return;
            }
          }
        }
      } catch {
        // Ignore intermittent detector errors while camera stream warms up.
      }

      barcodeScanRafRef.current = requestAnimationFrame(scanFrame);
    };

    barcodeScanRafRef.current = requestAnimationFrame(scanFrame);
  };

  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  useEffect(() => {
    hasProcessedRef.current = hasProcessedScan;
  }, [hasProcessedScan]);

  useEffect(() => {
    let mounted = true;

    const setupBarcodeDetector = async () => {
      if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
        if (mounted) setBarcodeCameraSupported(false);
        return;
      }

      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = CAMERA_BARCODE_FORMATS.filter((format) => supported.includes(format));
        if (!formats.length) {
          if (mounted) setBarcodeCameraSupported(false);
          return;
        }

        barcodeDetectorRef.current = new window.BarcodeDetector({ formats });
        if (mounted) setBarcodeCameraSupported(true);
      } catch {
        if (mounted) setBarcodeCameraSupported(false);
      }
    };

    setupBarcodeDetector();
    return () => {
      mounted = false;
    };
  }, []);
  
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
      // Process only when modal is open and not already processing
      if (!isOpen || hasProcessedScan || processingRef.current) return;
      
      // If Enter is pressed or we receive a sufficient number of characters, process the buffer
      if ((e.key === 'Enter' || e.key === 'Tab') && externalScanBuffer) {
        e.preventDefault(); // Prevent form submission
        
        // Clear any pending timeout to prevent double processing
        if (externalBufferTimeoutRef.current) {
          clearTimeout(externalBufferTimeoutRef.current);
          externalBufferTimeoutRef.current = null;
        }
        
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
          if (externalScanBuffer.length > 3 && !processingRef.current) {
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
    if (processingRef.current || !externalScanBuffer || hasProcessedScan) return;
    
    // Immediately set processing flag to prevent any race conditions
    processingRef.current = true;
    setProcessingExternalScan(true);
    setHasProcessedScan(true);
    
    try {
      // Get the scanned value
      const scanValue = externalScanBuffer.trim();
      
      // Clear buffer immediately to prevent overlapping scans
      setExternalScanBuffer('');
      
      // Clear any pending timeout
      if (externalBufferTimeoutRef.current) {
        clearTimeout(externalBufferTimeoutRef.current);
        externalBufferTimeoutRef.current = null;
      }
      
      // Check for duplicate scan (same value within 2 seconds)
      const now = Date.now();
      if (lastScanRef.current.value === scanValue && (now - lastScanRef.current.timestamp) < 2000) {
        console.log('Duplicate scan detected, ignoring');
        processingRef.current = false;
        setProcessingExternalScan(false);
        return;
      }
      
      // Update last scan
      lastScanRef.current = { value: scanValue, timestamp: now };
      
      // Process the scanned code with a delay for the animation
      setTimeout(() => {
        handleScanResult(scanValue, 'external');
      }, 700);
    } catch (error) {
      console.error('Error processing external scan:', error);
      setError('Failed to process the scanned code');
      setExternalScanBuffer('');
      processingRef.current = false;
      setProcessingExternalScan(false);
    }
  };

  const handleScanAnother = async () => {
    setShowChildInfo(false);
    setScannedChildInfo(null);
    setShowSuccessAnimation(false);
    setError(null);
    setHasProcessedScan(false);
    setProcessingExternalScan(false);
    setExternalScanBuffer('');

    processingRef.current = false;
    hasProcessedRef.current = false;
    lastScanRef.current = { value: '', timestamp: 0 };

    await startScanning();
  };
  
  // Start webcam scanning
  const startScanning = async () => {
    try {
      // Show loading state first
      setCameraLoading(true);
      setError(null);
      
      // Reset internal state synchronously
      scanningRef.current = true;
      hasProcessedRef.current = false;
      processingRef.current = false;
      lastScanRef.current = { value: '', timestamp: 0 };
      
      if (!videoRef.current) return;
      
      // Create QR scanner instance if it doesn't exist
      if (!qrScannerRef.current) {
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          result => {
            if (processingRef.current || hasProcessedRef.current) return;
            handleDetectedScan(result.data, 'webcam');
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: scanTuning.highlightScanRegion,
            highlightCodeOutline: scanTuning.highlightCodeOutline,
            maxScansPerSecond: scanTuning.maxScansPerSecond,
            preferredCamera: 'environment',
          }
        );
      }

      barcodeLastDetectAtRef.current = 0;
      
      // Wait a bit to let the loading state render smoothly
      await new Promise(resolve => setTimeout(resolve, scanTuning.startUiDelayMs));
      
      // Start the scanner and wait for it
      await qrScannerRef.current.start();
      
      // Wait for camera feed to stabilize
      await new Promise(resolve => setTimeout(resolve, scanTuning.stabilizeDelayMs));
      
      // Only after camera is ready, update UI state
      setCameraLoading(false);
      setScanning(true);
      setShowSuccessAnimation(false);
      setHasProcessedScan(false);
      
      if (barcodeCameraSupported) {
        startBarcodeLoop();
      }
      
      // Log available cameras for debugging
      QrScanner.listCameras().then(cameras => {
        console.log('Available cameras:', cameras);
      });
      
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      setCameraLoading(false);
      setScanning(false);
      setError(`Camera access error: ${err.message}`);
    }
  };
  
  // Stop webcam scanning
  const stopScanning = async () => {
    // Start the stopping process
    setScanning(false);
    
    // Wait briefly for UI to transition (shorter wait for seamless fade)
    await new Promise(resolve => setTimeout(resolve, scanTuning.stopUiDelayMs));
    
    // Then stop the actual camera
    stopBarcodeLoop();
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    barcodeLastDetectAtRef.current = 0;
    scanningRef.current = false;
    setCameraLoading(false);
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
  
  // Handle successful scan from camera, barcode-camera, or external scanner
  const handleScanResult = async (result) => {
    // Stop scanning
    stopScanning();
    
    // Call the onScanSuccess callback with the result and a callback to receive child info
    const scanOutcome = await onScanSuccess(result);

    // Explicit modal-level error contract from caller
    if (scanOutcome?.modalError) {
      setShowSuccessAnimation(false);
      setShowChildInfo(false);
      setScannedChildInfo(null);
      setError(scanOutcome.modalError);
      setHasProcessedScan(false);
      processingRef.current = false;
      hasProcessedRef.current = false;
      return;
    }

    const childInfo = scanOutcome?.childInfo || scanOutcome;
    
    // If we got child info, show it after animation
    if (childInfo) {
      setError(null);
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setScannedChildInfo(childInfo);
        setShowChildInfo(true);
      }, 800);
    } else {
      setShowSuccessAnimation(false);
      setHasProcessedScan(false);
      processingRef.current = false;
      hasProcessedRef.current = false;
    }
  };
  
  // Clean up when modal closes or component unmounts
  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      setExternalScanBuffer('');
      setError(null);
      setCameraLoading(false);
      setShowSuccessAnimation(false);
      setHasProcessedScan(false);
      setScannedChildInfo(null);
      setShowChildInfo(false);
      processingRef.current = false;
      scanningRef.current = false;
      hasProcessedRef.current = false;
      // Reset last scan when modal closes
      lastScanRef.current = { value: '', timestamp: 0 };
    }
    
    // Clean up resources when component unmounts
    return () => {
      stopScanning();
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      stopBarcodeLoop();
      if (externalBufferTimeoutRef.current) {
        clearTimeout(externalBufferTimeoutRef.current);
      }
    };
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan QR or Barcode"
      size="md"
      variant="primary"
      closeButton={true}
    >
      <div className="p-5 relative" ref={modalContentRef}>
        {/* Success animation overlay - positioned only over the modal content */}
        <AnimatePresence>
          {showSuccessAnimation && !showChildInfo && (
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
          {showChildInfo && scannedChildInfo && (
            <motion.div 
              className="absolute inset-0 z-30 flex items-center justify-center bg-white/95 backdrop-blur-sm rounded-md p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="bg-white border-2 border-green-500 rounded-lg shadow-lg p-6 max-w-sm w-full"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                {/* Success header with icon */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Action status */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {scannedChildInfo.action === 'check-in' ? 'Checked In!' : 'Checked Out!'}
                  </h3>
                  <p className="text-sm text-gray-500">Scan successful</p>
                </div>
                
                {/* Child information card */}
                <div className="bg-gradient-to-br from-nextgen-blue/5 to-nextgen-blue/10 rounded-lg p-4 space-y-3">
                  {/* Photo and name */}
                  <div className="flex items-center gap-3 pb-3 border-b border-nextgen-blue/20">
                    {scannedChildInfo.photo_url ? (
                      <img
                        src={scannedChildInfo.photo_url}
                        alt={scannedChildInfo.fullName}
                        className="h-14 w-14 rounded-full object-cover border-2 border-nextgen-blue/30"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-nextgen-blue/20 flex items-center justify-center border-2 border-nextgen-blue/30">
                        <span className="text-nextgen-blue-dark font-bold text-lg">
                          {scannedChildInfo.initials}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-lg truncate">
                        {scannedChildInfo.fullName}
                      </p>
                      {scannedChildInfo.nickname && (
                        <p className="text-sm text-gray-600 italic">"{scannedChildInfo.nickname}"</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Child details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">ID:</span>
                      <span className="font-semibold text-nextgen-blue-dark">{scannedChildInfo.formalId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Age:</span>
                      <span className="font-semibold text-gray-900">{scannedChildInfo.age} years old</span>
                    </div>
                    {scannedChildInfo.ageGroup && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Group:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-nextgen-blue text-white">
                          {scannedChildInfo.ageGroup}
                        </span>
                      </div>
                    )}
                    {scannedChildInfo.gender && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Gender:</span>
                        <span className="font-semibold text-gray-900">{scannedChildInfo.gender}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Success actions */}
                <div className="mt-5 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScanAnother}
                    icon={
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    }
                    iconPosition="left"
                  >
                    Scan Another
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 mb-4 rounded-r-md backdrop-blur-sm shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-nextgen-blue-dark font-small">
                Scan a QR code or barcode with your camera or handheld scanner
              </p>
            </div>
          </div>
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
              <AlertNew variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </AlertNew>
            </motion.div>
          )}
          
        </AnimatePresence>
        
        {/* Camera Preview Area */}
        <div 
          ref={videoContainerRef}
          className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 max-w-sm mx-auto transition-all duration-300"
        >
          <video 
            ref={videoRef}
            className="h-full w-full object-cover transition-opacity duration-300"
            playsInline 
            muted
          />
          
          {cameraLoading && (
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900/60 to-gray-900/40 z-10 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <svg className="h-10 w-10 animate-spin text-nextgen-blue mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-white text-sm font-medium">Initializing camera...</p>
              </motion.div>
            </motion.div>
          )}
          
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
                  <svg className="h-3 w-3 animate-spin text-nextgen-blue mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Scanning
                </div>
              </div>
            </>
          )}
          
          {!scanning && !cameraLoading && (
            <motion.div 
              className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-nextgen-blue/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-center">Camera preview will appear here</p>
              <p className="text-sm text-center mt-2">Click "Start Camera" to begin scanning</p>
            </motion.div>
          )}
        </div>

        {/* Preview text below camera - always visible to prevent button shift */}
        <motion.div 
          className="text-center mt-4 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: scanning || cameraLoading ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          <p>Click "Start Camera" to begin scanning</p>
        </motion.div>


        {/* Action Buttons - Fixed layout */}
        <div className="flex justify-end items-center mt-4 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="whitespace-nowrap"
          >
            Close
          </Button>
          
          {!showSuccessAnimation && (
            <Button
              variant={scanning ? "danger" : "primary"}
              onClick={scanning ? stopScanning : startScanning}
              disabled={showSuccessAnimation || cameraLoading}
              className="whitespace-nowrap transition-all duration-200"
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
              {cameraLoading ? "Initializing..." : scanning ? "Stop Camera" : "Start Camera"}
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