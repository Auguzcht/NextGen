import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Use the base URL from your environment for correct path resolution
const ngLogo = `${import.meta.env.BASE_URL}NextGen-Logo.svg`;

const LoadingScreen = ({ finishLoading, isInitialLoadingComplete = false }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [forceExit, setForceExit] = useState(false);
  const { user, initialized, loading, resetAuthState } = useAuth();
  const navigate = useNavigate();
  
  // Force exit after safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (!isExiting) {
        console.log('LoadingScreen - Safety timeout triggered, forcing exit');
        setForceExit(true);
        setIsExiting(true);
        finishLoading && finishLoading();
        
        // Force reset auth state to prevent loading loop
        resetAuthState();
        
        // Add direct navigation on safety timeout
        const redirectTimer = setTimeout(() => {
          navigate('/login', { replace: true });
        }, 500);
        
        return () => clearTimeout(redirectTimer);
      }
    }, 10000); // 10 second safety timeout
    
    return () => clearTimeout(safetyTimeout);
  }, [finishLoading, isExiting, navigate, resetAuthState]);
  
  // Initialize mounting state
  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timeout);
  }, []);

  // Exit strategy based on auth state
  const handleAuthBasedExit = useCallback(() => {
    if (initialized) {
      console.log('LoadingScreen - Auth initialized, preparing to exit');
      
      // Faster exit - no delay needed
      setIsExiting(true);
      
      // Quick completion
      const loadingTimer = setTimeout(() => {
        finishLoading && finishLoading();
      }, 300);
      
      return () => {
        clearTimeout(loadingTimer);
      };
    }
    
    // If not initialized after reasonable time, force it
    const forcedInitTimer = setTimeout(() => {
      if (!initialized) {
        console.log('LoadingScreen - Forcing initialization after delay');
        setIsExiting(true);
        finishLoading && finishLoading();
      }
    }, 3000); // Reduced from 5000 to 3000
    
    return () => clearTimeout(forcedInitTimer);
  }, [initialized, finishLoading]);

  // Handle exit animation timings based on auth and manual triggers
  useEffect(() => {
    // Check if we should exit based on initialLoadingComplete prop
    const shouldStartExit = isInitialLoadingComplete || forceExit;
    
    if (shouldStartExit) {
      // Immediate exit - no delays
      setIsExiting(true);
      
      const loadingTimer = setTimeout(() => {
        finishLoading && finishLoading();
      }, 300);
      
      return () => {
        clearTimeout(loadingTimer);
      };
    } else {
      // Otherwise use auth-based exit strategy
      return handleAuthBasedExit();
    }
  }, [isInitialLoadingComplete, finishLoading, forceExit, handleAuthBasedExit]);

  // Pre-generate random positions for geometric shapes
  const shapeProps = useMemo(() => {
    return Array.from({ length: 15 }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: 0.2 + (Math.random() * 0.3),
      scale: 0.5 + (Math.random() * 0.5),
      rotate: 45 + (Math.random() * 90),
      exitY: (Math.random() > 0.5 ? -40 : 40) * (Math.random() + 0.5),
      exitX: (Math.random() > 0.5 ? -40 : 40) * (Math.random() + 0.5),
      type: Math.random() > 0.7 ? 'circle' : Math.random() > 0.5 ? 'square' : 'triangle'
    }));
  }, []);

  // Light beam animation variants
  const lightBeamVariants = {
    initial: { opacity: 0, y: 0 },
    animate: {
      opacity: [0, 0.7, 0],
      y: -20,
      transition: {
        repeat: Infinity,
        duration: 2,
        repeatType: "loop",
        ease: "easeInOut"
      }
    },
    exit: {
      opacity: 0,
      y: -30,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  // Geometric shape variants
  const shapeVariants = {
    initial: { opacity: 0, scale: 0, rotate: 45 },
    animate: (i) => ({
      opacity: shapeProps[i].opacity,
      scale: shapeProps[i].scale,
      rotate: shapeProps[i].rotate,
      transition: {
        delay: i * 0.04,
        duration: 0.8 + (Math.random() * 0.4),
        ease: "easeOut"
      }
    }),
    hover: {
      rotate: '+=15deg',
      scale: 1.05,
      transition: { duration: 0.3 }
    },
    exit: (i) => ({
      opacity: 0,
      scale: 0,
      y: shapeProps[i].exitY,
      x: shapeProps[i].exitX,
      transition: {
        delay: i * 0.02,
        duration: 0.4,
        ease: "easeOut"
      }
    })
  };

  // Text character animation
  const textVariants = {
    hidden: { opacity: 0 },
    visible: (i) => ({
      opacity: 1,
      transition: {
        delay: 0.6 + (i * 0.05),
        duration: 0.3
      }
    }),
    exit: (i) => ({
      opacity: 0,
      y: 20,
      transition: {
        delay: i * 0.01,
        duration: 0.2,
        ease: "easeIn"
      }
    })
  };

  // Loading text and different messages based on auth state
  const getLoadingMessage = () => {
    if (forceExit) return "Resolving session state";
    if (user) return "Welcome back";
    if (initialized && !user) return "NextGen Ministry";
    return "NextGen Ministry";
  };
  
  const loadingText = getLoadingMessage();
  const subText = initialized 
    ? (user ? "Setting up your workspace" : "Please sign in to continue") 
    : "Initializing application";

  // Wipe animation variants
  const wipeVariants = {
    initial: { scaleX: 0, originX: 0 },
    animate: { scaleX: 0 },
    exit: {
      scaleX: 1, 
      transition: { 
        duration: 0.4, 
        ease: "circOut" 
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isExiting ? (
        <motion.div 
          key="loading-screen"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-nextgen-blue/10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0,
            textAlign: 'center',
          }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div 
              className="absolute inset-0 opacity-20"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                repeat: Infinity,
                repeatType: "mirror",
                duration: 15,
                ease: "linear"
              }}
              style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(48, 206, 228, 0.2) 0%, transparent 50%)',
                backgroundSize: '120vw 120vh',
                willChange: 'background-position',
              }}
            />
            
            <div className="absolute -inset-[10%] opacity-25">
              {shapeProps.map((shape, i) => {
                let ShapeElement;
                
                if (shape.type === 'circle') {
                  ShapeElement = <div className="absolute rounded-full bg-nextgen-blue" style={{
                    width: '30px',
                    height: '30px',
                  }} />;
                } else if (shape.type === 'square') {
                  ShapeElement = <div className="absolute bg-nextgen-orange" style={{
                    width: '25px',
                    height: '25px',
                  }} />;
                } else {
                  ShapeElement = <div className="absolute bg-nextgen-blue" style={{
                    width: '30px',
                    height: '30px',
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                  }} />;
                }
                
                return (
                  <motion.div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: `${shape.top}%`,
                      left: `${shape.left}%`,
                    }}
                    variants={shapeVariants}
                    custom={i}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    whileHover="hover"
                  >
                    {ShapeElement}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ 
              opacity: 0, 
              y: -30,
              transition: { duration: 0.4, ease: "easeInOut" }
            }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center relative z-10"
            style={{
              maxWidth: '340px',
              width: '100%',
              margin: '0 auto'
            }}
          >
            <div className="relative mb-8">
              <motion.div 
                className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex justify-center space-x-1.5"
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="bg-nextgen-blue/60 rounded-full"
                    style={{
                      width: `${2 + (i % 2)}px`,
                      height: `${8 + (i % 3) * 2}px`
                    }}
                    variants={lightBeamVariants}
                    transition={{ 
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
              
              <div className="relative w-32 h-32 mb-6 flex justify-center items-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-nextgen-blue to-nextgen-orange opacity-50 blur-lg"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.15, 0.25, 0.15]
                  }}
                  exit={{
                    scale: 1.5,
                    opacity: 0,
                    transition: { duration: 0.5 }
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                />
                
                <motion.div
                  className="absolute inset-2 rounded-full bg-gradient-to-tr from-nextgen-blue-light/50 to-nextgen-orange-light/40 blur-md"
                  animate={{ 
                    rotate: [0, 180],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  exit={{
                    rotate: 360,
                    scale: 0,
                    opacity: 0,
                    transition: { duration: 0.5 }
                  }}
                  transition={{
                    rotate: {
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    },
                    scale: {
                      duration: 4,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }
                  }}
                />
                
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    rotate: 0 
                  }}
                  exit={{ 
                    scale: 0.8, 
                    opacity: 0,
                    transition: {
                      duration: 0.3,
                      ease: "easeOut"
                    }
                  }}
                  transition={{ 
                    duration: 0.5,
                    ease: "easeOut"
                  }}
                >
                  <img src={ngLogo} alt="NextGen Logo" className="h-24 w-auto relative z-10" />
                </motion.div>
              </div>
            </div>
            
            {/* Progress bar with visual feedback based on auth state */}
            <motion.div
              className="w-72 h-2.5 bg-gray-100 rounded-full overflow-hidden mt-4 relative"
              initial={{ opacity: 0, width: "60%" }}
              animate={{ opacity: 1, width: "72%" }}
              exit={{ 
                width: "60%", 
                opacity: 0, 
                transition: { duration: 0.3 } 
              }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {/* Progress fill that responds to auth state */}
              <motion.div
                className={`h-full rounded-full relative ${
                  forceExit 
                    ? "bg-amber-500" 
                    : initialized && !user 
                      ? "bg-gradient-to-r from-nextgen-blue to-nextgen-orange" 
                      : "bg-gradient-to-r from-nextgen-blue to-nextgen-orange"
                }`}
                initial={{ width: 0 }}
                animate={{ 
                  width: forceExit ? "70%" : "100%",
                  transition: {
                    duration: forceExit ? 0.5 : 2.6,
                    ease: "easeInOut"
                  }
                }}
                exit={{ width: "100%" }}
              />
              
              <motion.div
                className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                animate={{
                  left: ["-100%", "200%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2,
                  ease: "linear",
                  repeatDelay: 0.3
                }}
              />
            </motion.div>
            
            {/* Loading state message */}
            <motion.div
              className="text-nextgen-blue text-sm mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              {forceExit ? "Resolving session..." : "Loading..."}
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={loadingText}
                className="overflow-hidden mt-5 h-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center">
                  {loadingText.split("").map((char, i) => (
                    <motion.span
                      key={i}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-nextgen-blue to-nextgen-orange font-semibold text-xl inline-block"
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={i}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            
            <motion.p
              className="text-nextgen-blue-dark/80 mt-2 text-xs font-light tracking-wide"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                y: 10,
                transition: { duration: 0.2 } 
              }}
              transition={{ 
                delay: 1,
                duration: 0.5
              }}
            >
              {subText}
            </motion.p>

            <div className="flex space-x-2 mt-8">
              {[0, 1, 2].map(i => (
                <motion.div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-nextgen-orange/70"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.8, 0.3]
                  }}
                  exit={{
                    scale: 0,
                    opacity: 0,
                    transition: { duration: 0.2, delay: i * 0.1 }
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            {/* Force exit button that appears after safety timeout */}
            {forceExit && (
              <motion.button
                className="mt-8 px-4 py-2 bg-nextgen-blue text-white rounded-md text-sm font-medium hover:bg-nextgen-blue-dark transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setIsExiting(true);
                  finishLoading && finishLoading();
                  navigate('/login', { replace: true });
                }}
              >
                Continue to Login
              </motion.button>
            )}
          </motion.div>
          
          {/* Animation layers */}
          <motion.div 
            className="fixed inset-0 bg-nextgen-blue z-60 transform origin-left"
            variants={wipeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ overflow: 'hidden' }}
          />
          
          <motion.div 
            className="fixed inset-0 bg-white z-50 transform origin-left"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 0 }}
            exit={{ 
              scaleX: 1, 
              transition: { 
                duration: 0.4, 
                ease: "circOut",
                delay: 0.1
              }
            }}
            style={{ overflow: 'hidden' }}
          />
        </motion.div>
      ) : (
        <motion.div 
          key="exit-screen"
          className="fixed inset-0 z-50 flex items-center justify-center bg-nextgen-blue/10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0,
            textAlign: 'center'
          }}
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.4 }}
          >
            <img src={ngLogo} alt="NextGen Logo" className="h-24 w-auto" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;