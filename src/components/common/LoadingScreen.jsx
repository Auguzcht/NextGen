import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NextGenLogo } from '../../assets/index.js';

const LoadingScreen = ({ finishLoading, isInitialLoadingComplete = false }) => {
  const [loadingText, setLoadingText] = useState('Loading');
  const [isExiting, setIsExiting] = useState(false);
  
  // Loading text animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingText(prevText => {
        if (prevText === 'Loading...') return 'Loading';
        return prevText + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle exit animation timing
  useEffect(() => {
    if (isInitialLoadingComplete) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 800);
      
      const finishTimer = setTimeout(() => {
        finishLoading && finishLoading();
      }, 1200);
      
      return () => {
        clearTimeout(exitTimer);
        clearTimeout(finishTimer);
      };
    }
  }, [finishLoading, isInitialLoadingComplete]);
  
  // Pre-generate random positions for background particles
  const particleProps = useMemo(() => {
    return Array.from({ length: 20 }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: 8 + Math.random() * 15,
      opacity: 0.1 + (Math.random() * 0.15),
      rotate: Math.random() * 360,
      duration: 10 + Math.random() * 30
    }));
  }, []);

  // Text variants for staggered animation
  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.3 + (i * 0.1),
        duration: 0.4
      }
    }),
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.2 }
    }
  };

  // Exit animation variant
  const wipeVariant = {
    initial: { scaleY: 0, originY: 1 },
    animate: { scaleY: 0 },
    exit: {
      scaleY: 1,
      transition: { duration: 0.4, ease: "circOut" }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isExiting ? (
        <motion.div 
          className="fixed inset-0 bg-white flex flex-col items-center justify-center text-[#30cee4] z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Background particle animation */}
          <div className="absolute inset-0 overflow-hidden">
            {particleProps.map((particle, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  top: `${particle.top}%`,
                  left: `${particle.left}%`,
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: i % 2 === 0 ? '#30cee4' : '#fb7610',
                  opacity: particle.opacity,
                }}
                animate={{
                  rotate: [particle.rotate, particle.rotate + 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  rotate: { 
                    duration: particle.duration, 
                    repeat: Infinity,
                    ease: "linear" 
                  },
                  scale: {
                    duration: 5 + Math.random() * 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }
                }}
              />
            ))}
          </div>

          {/* Logo with enhanced animation */}
          <motion.div
            className="relative mb-10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 200,
                damping: 15,
                duration: 0.7
              }
            }}
            exit={{ 
              scale: 0.9, 
              opacity: 0,
              y: -20,
              transition: { duration: 0.3 }
            }}
          >
            {/* Glowing effect */}
            <motion.div
              className="absolute inset-0 rounded-full blur-xl"
              animate={{ 
                boxShadow: [
                  '0 0 15px 2px rgba(48, 206, 228, 0.3)', 
                  '0 0 25px 5px rgba(251, 118, 16, 0.3)',
                  '0 0 15px 2px rgba(48, 206, 228, 0.3)'
                ],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
            <img 
              src={NextGenLogo} 
              alt="NextGen Ministry" 
              className="w-52 h-52 relative z-10"
            />
          </motion.div>
          
          {/* Enhanced progress bar */}
          <motion.div
            className="w-72 h-3 bg-gray-100 rounded-full overflow-hidden relative"
            initial={{ width: "60%" }}
            animate={{ width: "72%" }}
            transition={{ duration: 0.6 }}
          >
            {/* Progress bar fill */}
            <motion.div
              className="h-full bg-gradient-to-r from-[#30cee4] to-[#fb7610] rounded-full"
              initial={{ width: "5%" }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity
              }}
            />
            
            {/* Shimmer effect */}
            <motion.div
              className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white to-transparent opacity-40"
              animate={{ left: ["-50%", "150%"] }}
              transition={{
                repeat: Infinity,
                duration: 1.8,
                repeatDelay: 0.5
              }}
            />
          </motion.div>
          
          {/* Animated loading text */}
          <motion.p 
            className="mt-6 text-xl font-medium text-[#fb7610]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {loadingText}
          </motion.p>
          
          {/* Animated subtitle */}
          <div className="overflow-hidden mt-2">
            <div className="flex justify-center">
              {"NextGen Ministry Management".split("").map((char, i) => (
                <motion.span
                  key={i}
                  className="text-[#30cee4] text-sm inline-block"
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
          </div>
          
          {/* Exit slide effect */}
          <motion.div 
            className="fixed inset-0 bg-[#30cee4] z-60 transform origin-bottom"
            variants={wipeVariant}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          
          {/* Second exit slide effect */}
          <motion.div 
            className="fixed inset-0 bg-[#fb7610] z-50 transform origin-bottom"
            initial={{ scaleY: 0, originY: 1 }}
            animate={{ scaleY: 0 }}
            exit={{ 
              scaleY: 1, 
              transition: { 
                duration: 0.4, 
                ease: "circOut",
                delay: 0.1
              }
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default LoadingScreen;