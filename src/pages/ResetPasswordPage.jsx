import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import supabase from '../services/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Swal from 'sweetalert2';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Listen for auth state changes (this will trigger when Supabase processes the recovery tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, 'Has session:', !!session);
      
      // Ignore auth state changes if we're in the middle of resetting password
      if (isResettingPassword) {
        console.log('Ignoring auth state change during password reset');
        return;
      }
      
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session && mounted) {
          console.log('Recovery session established via auth state change');
          setIsValidToken(true);
        }
      }
    });
    
    // Check if there's a valid recovery token in the URL
    const checkToken = async () => {
      // Get the full hash (everything after #)
      const hash = window.location.hash;
      console.log('Full hash:', hash);
      
      // Parse hash parameters - remove the # first
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      console.log('Reset password page - Hash params:', { 
        accessToken: !!accessToken, 
        type, 
        error,
        allParams: Array.from(hashParams.entries())
      });

      // Handle error first
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid or Expired Link',
          text: errorDescription || 'This password reset link is invalid or has expired. Please request a new one.',
          confirmButtonColor: '#30cee4'
        }).then(() => {
          navigate('/login');
        });
        return;
      }

      // If there are tokens in the URL, give Supabase time to process them
      // The SDK will automatically exchange tokens for a session and clean the URL
      if (accessToken && type === 'recovery') {
        console.log('Recovery tokens detected in URL, waiting for Supabase to establish session...');
        // Wait a bit for Supabase SDK to process the tokens
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if user is already authenticated (Supabase auto-logs them in via the recovery link)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', { hasSession: !!session, sessionError, sessionType: type });
      
      // If we have a session on the reset-password page, it must be from the recovery link
      // (Users aren't normally logged in when visiting this page)
      if (session && mounted) {
        console.log('Session detected on reset page - allowing password reset');
        setIsValidToken(true);
        return;
      }
      
      // If no session yet but we had tokens, wait a bit longer and retry
      if ((accessToken || type === 'recovery') && !session) {
        console.log('No session yet, retrying...');
        // Give Supabase more time to establish the session
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession && mounted) {
          console.log('Session established on retry');
          setIsValidToken(true);
          return;
        } else {
          console.error('Failed to establish session after retries');
          if (mounted) {
            Swal.fire({
              icon: 'error',
              title: 'Session Error',
              text: 'Unable to verify your reset link. Please request a new password reset.',
              confirmButtonColor: '#30cee4'
            }).then(() => {
              navigate('/login');
            });
          }
          return;
        }
      }

      // No token, no error, no session - user navigated directly to the page
      if (!accessToken && !error && !session) {
        Swal.fire({
          icon: 'warning',
          title: 'No Reset Token',
          text: 'Please use the password reset link sent to your email.',
          confirmButtonColor: '#30cee4'
        }).then(() => {
          navigate('/login');
        });
      }
    };

    checkToken();
    
    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, isResettingPassword]);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Passwords Do Not Match',
        text: 'Please make sure both passwords are identical.',
        confirmButtonColor: '#30cee4'
      });
      return;
    }

    if (password.length < 8) {
      Swal.fire({
        icon: 'error',
        title: 'Password Too Short',
        text: 'Password must be at least 8 characters long.',
        confirmButtonColor: '#30cee4'
      });
      return;
    }

    setIsLoading(true);
    setIsResettingPassword(true); // Prevent auth listener interference

    try {
      console.log('Starting password update...');
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      console.log('Password updated successfully, signing out...');

      // Sign out the user after password reset with a timeout
      // This ensures they must log in with their new password
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Wait for signOut or timeout, whichever comes first
      await Promise.race([signOutPromise, timeoutPromise]);
      
      console.log('Sign out completed, showing success message...');

      // Show success message and navigate
      await Swal.fire({
        icon: 'success',
        title: 'Password Updated!',
        text: 'Your password has been successfully updated. Please log in with your new password.',
        confirmButtonColor: '#30cee4',
        allowOutsideClick: false
      });
      
      console.log('Navigating to login...');
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('Error resetting password:', error);
      setIsResettingPassword(false); // Re-enable auth listener on error
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to reset password. Please try again.',
        confirmButtonColor: '#30cee4'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nextgen-blue via-nextgen-blue-dark to-nextgen-blue-darker">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p>Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-nextgen-blue via-nextgen-blue-dark to-nextgen-blue-darker p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-block"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
              <svg className="h-16 w-16 text-white mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
          <p className="text-white/80">Choose a strong password for your account</p>
        </div>

        {/* Reset Password Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <Input
                type="password"
                id="password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={8}
                helperText="Must be at least 8 characters"
                autoFocus
              />
            </div>

            <div>
              <Input
                type="password"
                id="confirmPassword"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  • At least 8 characters long
                </li>
                <li className={password === confirmPassword && password.length > 0 ? 'text-green-600' : ''}>
                  • Both passwords match
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading || password.length < 8 || password !== confirmPassword}
              isLoading={isLoading}
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-nextgen-blue hover:text-nextgen-blue-dark transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center text-white/60 text-sm">
          <p>NextGen Ministry Management System</p>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
