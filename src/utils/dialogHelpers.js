import { toast } from '../components/ui';

/**
 * Helper utilities to replace SweetAlert2 with new shadcn-style components
 * These provide similar imperative APIs for common use cases
 */

// For simple confirmations, return a promise-based API
export const showConfirmDialog = ({ title, description, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  return new Promise((resolve) => {
    // We'll need to use the Dialog component imperatively
    // For now, return true to allow migration - pages will use Dialog component directly
    resolve(true);
  });
};

// Success toast (replaces Swal.fire({ icon: 'success' }))
export const showSuccess = (title, description = '') => {
  toast.success(title, { description });
};

// Error toast (replaces Swal.fire({ icon: 'error' }))
export const showError = (title, description = '') => {
  toast.error(title, { description });
};

// Warning toast (replaces Swal.fire({ icon: 'warning' }))
export const showWarning = (title, description = '') => {
  toast.warning(title, { description });
};

// Info toast (replaces Swal.fire({ icon: 'info' }))
export const showInfo = (title, description = '') => {
  toast.info(title, { description });
};

// Loading toast that can be updated
export const showLoading = (title = 'Loading...') => {
  return toast(title, { 
    variant: 'default',
    duration: Infinity 
  });
};

// Helper to map Swal patterns to new toast
export const swalToToast = (swalConfig) => {
  const { icon, title, text, timer = 5000 } = swalConfig;
  
  const description = text || '';
  const duration = timer;
  
  switch(icon) {
    case 'success':
      return toast.success(title, { description, duration });
    case 'error':
      return toast.error(title, { description, duration });
    case 'warning':
      return toast.warning(title, { description, duration });
    case 'info':
      return toast.info(title, { description, duration });
    default:
      return toast(title, { description, duration });
  }
};
