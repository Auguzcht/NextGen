import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dialog = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  // Clone children and pass onClose to DialogContent if not already provided
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type?.displayName === 'DialogContent') {
      return React.cloneElement(child, { 
        onClose: child.props.onClose || (() => onOpenChange(false))
      });
    }
    return child;
  });

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Dialog Container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {childrenWithProps}
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

const DialogContent = React.forwardRef(
  ({ className, children, onClose, showCloseButton = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
        className={`relative z-10 w-full max-w-lg rounded-xl border border-gray-200/60 bg-white shadow-2xl overflow-hidden ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <div className="p-6">
          {children}
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-nextgen-blue focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </motion.div>
    );
  }
);

DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }) => (
  <div
    className={`flex flex-col space-y-2 text-left mb-4 ${className || ''}`}
    {...props}
  />
);

DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6 pt-4 border-t border-gray-100 ${className || ''}`}
    {...props}
  />
);

DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-xl font-semibold leading-tight tracking-tight text-gray-900 ${className || ''}`}
    {...props}
  />
));

DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-gray-600 leading-relaxed ${className || ''}`}
    {...props}
  />
));

DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
