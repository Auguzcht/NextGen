import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, Input, Alert, Spinner } from '../ui';

const LoginForm = ({ onLoginStart, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const redirectInitiated = useRef(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, setLoginRedirectInProgress, clearLoginFlags, user } = useAuth();
  
  // Get the redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  // Animation variants for staggered form elements
  const formVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  // Effect to handle the redirect after successful authentication
  useEffect(() => {
    // Check if we're authenticated and loginSuccess is true
    if (user && loginSuccess && !redirectInitiated.current) {
      console.log('User authenticated and loginSuccess is true, initiating redirect...');
      redirectInitiated.current = true;
      
      // Set global redirect flag to true
      setLoginRedirectInProgress(true);
      
      // Redirect with a delay to allow for animation
      const redirectTimer = setTimeout(() => {
        console.log('Navigating to dashboard...');
        navigate(from, { replace: true });
        
        // Reset the redirect flag after a delay to ensure navigation completes
        const cleanupTimer = setTimeout(() => {
          console.log('Resetting redirect flags...');
          setLoginRedirectInProgress(false);
          clearLoginFlags();
          redirectInitiated.current = false;
        }, 500); // Increased from 100ms to 500ms for more reliability
        
        return () => clearTimeout(cleanupTimer);
      }, 1500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, loginSuccess, navigate, from, setLoginRedirectInProgress, clearLoginFlags]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    if (onLoginStart) onLoginStart();

    try {
      // Show loading state in the button (keep this delay)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Don't set loginRedirectInProgress here - REMOVE THIS LINE
      // setLoginRedirectInProgress(true);
      
      // Attempt to sign in
      await signIn(email, password, rememberMe);
      
      // If we get here, authentication was successful
      setLoginSuccess(true);
      
      if (onLoginSuccess) onLoginSuccess();
      
      // No need to clear form values here since we're redirecting
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      setLoginRedirectInProgress(false); // Reset flag on error
    }
  };

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {loginSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-12 bg-white p-6 rounded-lg shadow-lg"
          >
            <Spinner 
              size="lg" 
              variant="primary" 
              type="fade"
              label="Redirecting to dashboard..." 
              labelPosition="bottom"
              className="mb-4"
            />
          </motion.div>
        ) : (
          <motion.div
            key="login-form"
            className="bg-white p-6 rounded-lg shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ 
              boxShadow: "0 10px 25px -5px rgba(48, 206, 228, 0.2)",
              y: -2,
              transition: { duration: 0.3 }
            }}
          >
            {/* Welcome text moved inside the form container */}
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-2xl font-bold text-nextgen-blue-dark">
                <AnimatePresence>
                  {"Welcome Back".split("").map((char, index) => (
                    <motion.span
                      key={index}
                      className="inline-block"
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 + (index * 0.03) }}
                      whileHover={{ 
                        y: -2,
                        color: "#1ca7bc",
                        transition: { duration: 0.2 }
                      }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </h2>
            </motion.div>
            
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <Alert variant="error">{error}</Alert>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.form 
              className="space-y-4" 
              onSubmit={handleLogin}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div variants={itemVariants} className="space-y-1">
                <label 
                  htmlFor="email-address" 
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <motion.input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue
                    transition-all duration-200"
                  placeholder="Enter your email"
                  whileFocus={{ scale: 1.01 }}
                  disabled={loading}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="space-y-1">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <motion.input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 
                    focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue
                    transition-all duration-200"
                  placeholder="Enter your password"
                  whileFocus={{ scale: 1.01 }}
                  disabled={loading}
                />
              </motion.div>
    
              <motion.div 
                variants={itemVariants} 
                className="flex justify-between mt-2 text-sm"
              >
                <motion.div
                  className="inline-flex items-center text-gray-600"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-nextgen-blue focus:ring-nextgen-blue"
                    disabled={loading}
                  />
                  <label htmlFor="remember-me" className="ml-2 cursor-pointer">
                    Remember me
                  </label>
                </motion.div>
    
                <motion.a
                  href="#"
                  className="text-nextgen-blue hover:text-nextgen-blue-dark transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Forgot password?
                </motion.a>
              </motion.div>
    
              <motion.div variants={itemVariants} className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  fullWidth
                  size="lg"
                  variant="primary"
                  animate={true}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-3 -ml-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </motion.div>
              
              {/* Demo credentials section - remove for production */}
              <motion.div 
                variants={itemVariants}
                className="text-center text-sm text-nextgen-blue-dark/70 mt-5 pt-3 border-t border-gray-100"
              >
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                  Demo credentials:
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
                  Admin: admin@nextgen.com / password
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>
                  Staff: staff@nextgen.com / password
                </motion.p>
              </motion.div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

LoginForm.defaultProps = {
  onLoginStart: () => {},
  onLoginSuccess: () => {}
};

export default LoginForm;