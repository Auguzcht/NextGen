import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import supabase from '../../services/supabase';
import { Button, Input, Alert, Spinner } from '../ui';
import Swal from 'sweetalert2';

const LoginForm = ({ onLoginStart, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
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
    if (loginSuccess) {
      const redirectTimer = setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [loginSuccess, navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    if (onLoginStart) onLoginStart();

    try {
      // Attempt to login
      const result = await login(email, password, rememberMe);
      
      if (result.success) {
        setLoginSuccess(true);
        if (onLoginSuccess) onLoginSuccess();
        
        // Navigate after a short delay
        setTimeout(() => {
          navigate(result.redirectTo, { replace: true });
        }, 1000);
      } else {
        setError(result.error);
        setLoading(false);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const { value: emailInput } = await Swal.fire({
      title: 'Forgot Password',
      html: `
        <p class="text-gray-600 mb-4">Enter your email address and we'll send you instructions to reset your password.</p>
        <input id="swal-input-email" class="swal2-input" placeholder="Email address" type="email" value="${email}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Send Reset Link',
      confirmButtonColor: '#30CEE4',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const emailValue = document.getElementById('swal-input-email').value;
        if (!emailValue) {
          Swal.showValidationMessage('Please enter your email address');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
          Swal.showValidationMessage('Please enter a valid email address');
          return false;
        }
        return emailValue;
      }
    });

    if (emailInput) {
      try {
        // Show loading state
        Swal.fire({
          title: 'Verifying Account...',
          html: 'Please wait while we verify your account.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Check if email exists in staff table
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('email, is_active')
          .eq('email', emailInput)
          .single();

        if (staffError || !staffData) {
          await Swal.fire({
            icon: 'error',
            title: 'Account Not Found',
            text: 'No account found with this email address. Please check your email and try again.',
            confirmButtonColor: '#30CEE4'
          });
          return;
        }

        if (!staffData.is_active) {
          await Swal.fire({
            icon: 'error',
            title: 'Account Inactive',
            text: 'Your account is inactive. Please contact your administrator.',
            confirmButtonColor: '#30CEE4'
          });
          return;
        }

        // Send password reset email using Supabase Auth
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailInput, {
          redirectTo: `${window.location.origin}/reset-password`
        });

        if (resetError) {
          throw resetError;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Reset Link Sent!',
          text: `We've sent password reset instructions to ${emailInput}. Please check your email.`,
          confirmButtonColor: '#30CEE4'
        });
      } catch (error) {
        console.error('Forgot password error:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to send reset link. Please try again later.',
          confirmButtonColor: '#30CEE4'
        });
      }
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
              className="text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-2xl font-bold text-nextgen-blue-dark mb-2">
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
              <motion.p
                className="text-sm text-gray-600"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Enter your email and password below to login to your account
              </motion.p>
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
              method="post"
              action="#"
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
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </motion.div>
              
              <motion.div variants={itemVariants} className="space-y-1 relative">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
    
                <motion.button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-nextgen-blue hover:text-nextgen-blue-dark transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={loading}
                >
                  Forgot password?
                </motion.button>
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
              
              {/* Help text */}
              <motion.div 
                variants={itemVariants}
                className="text-center text-sm text-gray-500 mt-6 pt-4 border-t border-gray-100"
              >
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                  Need help? Contact your administrator
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