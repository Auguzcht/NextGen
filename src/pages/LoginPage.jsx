import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import LoginForm from '../components/auth/LoginForm.jsx';

// Use the base URL from Vite to handle both development and production paths
const NextGenLogo = `${import.meta.env.BASE_URL}NextGen-Logo.png`;
const NextGenLogoSvg = `${import.meta.env.BASE_URL}NextGen-Logo.svg`;

const LoginPage = () => {
  const [showContent, setShowContent] = useState(false);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  
  const navigate = useNavigate();
  const { user, loginRedirectInProgress } = useAuth();

  // Pre-generate positions for abstract shapes to ensure consistency
  const shapeProps = useMemo(() => {
    return Array.from({ length: 15 }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: 0.1 + (Math.random() * 0.1),
      scale: 0.5 + (Math.random() * 0.5),
      rotate: 45 + (Math.random() * 90),
    }));
  }, []);

  // Preload images to avoid flashing
  useEffect(() => {
    const logoImg = new Image();
    logoImg.src = NextGenLogo;
    logoImg.onload = () => setImagesPreloaded(true);
  }, []);

  // Delay showing content for smooth entrance animation
  useEffect(() => {
    if (imagesPreloaded) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [imagesPreloaded]);

  // Signal from LoginForm that login is in progress - no longer needed, handled by context
  const handleLoginStart = () => {};

  // Handle successful login from LoginForm - no longer needed, handled by form
  const handleLoginSuccess = () => {};

  // CRITICAL: Update the useEffect to check loginRedirectInProgress
  useEffect(() => {
    // Only redirect if user exists AND we're not already in the middle of redirecting
    if (user && !loginRedirectInProgress) {
      console.log('User already authenticated (initial load), redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, loginRedirectInProgress]);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-nextgen-blue/5 to-nextgen-orange/5 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient background */}
        <motion.div 
          className="absolute inset-0 opacity-10"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            repeat: Infinity,
            repeatType: "mirror",
            duration: 20,
            ease: "linear"
          }}
          style={{
            backgroundImage: 'radial-gradient(circle at center, rgba(48, 206, 228, 0.2) 0%, transparent 70%)',
            backgroundSize: '120vw 120vh',
          }}
        />
        
        {/* Abstract shapes pattern with consistent positions */}
        <div className="absolute inset-0 pointer-events-none">
          {shapeProps.map((shape, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-lg ${i % 2 === 0 ? 'bg-nextgen-blue' : 'bg-nextgen-orange'} w-8 h-8`}
              style={{
                top: `${shape.top}%`,
                left: `${shape.left}%`,
                borderRadius: `${(i % 3) * 30}%`,
              }}
              initial={{ opacity: 0, scale: 0, rotate: shape.rotate }}
              animate={{ 
                opacity: shape.opacity,
                scale: shape.scale,
                rotate: shape.rotate,
              }}
              transition={{ 
                delay: i * 0.1,
                duration: 1.5,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="relative min-h-screen flex flex-col lg:flex-row items-center justify-center z-10">
        {/* Left side - branding column */}
        <motion.div 
          className="lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-16"
          initial={{ opacity: 0, x: -50 }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            transition: { 
              type: "spring", 
              stiffness: 100, 
              damping: 20,
              delay: 0.2
            }
          }}
        >
          {/* Logo with glow effect */}
          <div className="relative mb-8">
            {/* Logo glow effect */}
            <motion.div
              className="absolute -inset-8 rounded-full opacity-70 blur-xl"
              style={{
                background: 'radial-gradient(circle at center, rgba(48, 206, 228, 0.3) 0%, rgba(251, 118, 16, 0.2) 60%, transparent 80%)',
              }}
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.6, 0.7, 0.6]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
            
            {/* Logo container with subtle hover */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.3, ease: "easeOut" }
              }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.2
              }}
            >
              <img 
                src={NextGenLogo} 
                alt="NextGen Logo" 
                className="w-64 relative z-10 drop-shadow-lg" 
              />
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-nextgen-blue-dark mb-2">
              <motion.span
                className="inline-block"
                whileHover={{ 
                  color: "#1ca7bc",
                  textShadow: "0 1px 8px rgba(48, 206, 228, 0.15)",
                  transition: { duration: 0.3 }
                }}
              >
                NextGen Ministry
              </motion.span>
            </h1>
            <motion.p 
              className="text-nextgen-orange-dark/80 max-w-md"
              whileHover={{ 
                color: "rgba(251, 118, 16, 0.9)",
                transition: { duration: 0.3 }
              }}
            >
              Streamlined Children's Ministry Management System
            </motion.p>
          </motion.div>
        </motion.div>
        
        {/* Right side - login form */}
        <AnimatePresence mode="wait">
          {showContent && (
            <motion.div
              className="lg:w-1/2 w-full flex justify-center items-center p-8"
              initial={{ opacity: 0, x: 50 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                transition: { 
                  type: "spring",
                  stiffness: 100, 
                  damping: 20,
                  delay: 0.3
                }
              }}
              exit={{ opacity: 0, x: 100 }}
            >
              <LoginForm 
                onLoginStart={handleLoginStart}
                onLoginSuccess={handleLoginSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer with animation */}
      <motion.div 
        className="absolute bottom-4 w-full flex justify-center text-sm text-nextgen-blue-dark/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{
          color: "rgba(28, 167, 188, 0.9)",
          transition: { duration: 0.3 }
        }}
      >
        <div className="relative group">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-3 bg-nextgen-blue/30 rounded-full"
                animate={{
                  opacity: [0, 0.7, 0],
                  y: [0, -10, -15],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  delay: i * 0.3,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          <p>NextGen Ministry Management System &copy; {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;