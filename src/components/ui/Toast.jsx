import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);
    
    if (toast.duration !== Infinity && toast.variant !== 'loading') {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = useCallback((id, updates) => {
    setToasts((prev) => prev.map((toast) => {
      if (toast.id === id) {
        const updatedToast = { ...toast, ...updates };
        // If updating from loading to another variant, set auto-dismiss
        if (toast.variant === 'loading' && updates.variant !== 'loading') {
          setTimeout(() => {
            removeToast(id);
          }, updates.duration || 5000);
        }
        return updatedToast;
      }
      return toast;
    }));
  }, []);

  const toast = useCallback(
    (options) => {
      if (typeof options === 'string') {
        return addToast({ variant: 'default', title: options });
      }
      return addToast(options);
    },
    [addToast]
  );

  toast.success = useCallback(
    (title, options = {}) => addToast({ ...options, variant: 'success', title }),
    [addToast]
  );

  toast.error = useCallback(
    (title, options = {}) => addToast({ ...options, variant: 'destructive', title }),
    [addToast]
  );

  toast.warning = useCallback(
    (title, options = {}) => addToast({ ...options, variant: 'warning', title }),
    [addToast]
  );

  toast.info = useCallback(
    (title, options = {}) => addToast({ ...options, variant: 'info', title }),
    [addToast]
  );

  toast.loading = useCallback(
    (title, options = {}) => addToast({ ...options, variant: 'loading', title, duration: Infinity }),
    [addToast]
  );

  toast.dismiss = useCallback(
    (id) => removeToast(id),
    [removeToast]
  );

  toast.update = useCallback(
    (id, updates) => updateToast(id, updates),
    [updateToast]
  );

  // Set the global toast instance
  useEffect(() => {
    setToastInstance({
      toast,
      removeToast,
      updateToast
    });
  }, [toast, removeToast, updateToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[10000] flex max-h-screen w-full flex-col gap-2 pointer-events-none md:max-w-[420px]">
          <AnimatePresence>
            {toasts.map((toastItem) => (
              <Toast key={toastItem.id} toast={toastItem} onClose={() => removeToast(toastItem.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

const Toast = ({ toast, onClose }) => {
  const { variant = 'default', title, description, action } = toast;

  const variantStyles = {
    default: 'bg-white border-gray-200/60 text-gray-900',
    success: 'bg-white border-green-200/60 text-green-900 [&>svg]:text-green-500',
    destructive: 'bg-white border-red-200/60 text-red-900 [&>svg]:text-red-500',
    warning: 'bg-white border-amber-200/60 text-amber-900 [&>svg]:text-amber-500',
    info: 'bg-white border-blue-200/60 text-blue-900 [&>svg]:text-blue-500',
    loading: 'bg-white border-[#30cee4]/40 text-[#1ca7bc] [&>svg]:text-[#30cee4]',
    nextgen: 'bg-white border-[#30cee4]/40 text-[#1ca7bc] [&>svg]:text-[#30cee4]',
  };

  const icons = {
    success: CheckCircle2,
    destructive: XCircle,
    warning: AlertCircle,
    info: Info,
    loading: Loader2,
    nextgen: Info,
  };

  const Icon = icons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 500, damping: 30 }}
      className={`pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border p-4 pr-10 shadow-lg backdrop-blur-sm transition-all ${
        variantStyles[variant] || variantStyles.default
      }`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          variant === 'loading' ? (
            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0 animate-spin" />
          ) : (
            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )
        )}
        <div className="grid gap-1 flex-1">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {description && <div className="text-sm opacity-90">{description}</div>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#30cee4] focus:ring-offset-1"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

let toastInstance = null;

export const setToastInstance = (instance) => {
  toastInstance = instance;
};

export const toast = (options) => {
  if (!toastInstance?.toast) {
    console.warn('Toast system not initialized. Wrap your app with ToastProvider');
    return;
  }
  return toastInstance.toast(options);
};

toast.success = (title, options) => toast({ ...options, variant: 'success', title });
toast.error = (title, options) => toast({ ...options, variant: 'destructive', title });
toast.warning = (title, options) => toast({ ...options, variant: 'warning', title });
toast.info = (title, options) => toast({ ...options, variant: 'info', title });
toast.loading = (title, options) => toast({ ...options, variant: 'loading', title, duration: Infinity });
toast.dismiss = (id) => {
  if (!toastInstance?.removeToast) {
    console.warn('Toast system not initialized');
    return;
  }
  toastInstance.removeToast(id);
};
toast.update = (id, updates) => {
  if (!toastInstance?.updateToast) {
    console.warn('Toast system not initialized');
    return;
  }
  toastInstance.updateToast(id, updates);
};
