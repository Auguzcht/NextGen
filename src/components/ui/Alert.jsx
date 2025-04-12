import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

// Alert variants with matching icons
const variants = {
  info: {
    className: "bg-blue-50 text-blue-800 border-blue-200",
    iconClassName: "text-blue-400",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  },
  success: {
    className: "bg-green-50 text-green-800 border-green-200",
    iconClassName: "text-green-400",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  },
  warning: {
    className: "bg-yellow-50 text-yellow-800 border-yellow-200",
    iconClassName: "text-yellow-400",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  },
  error: {
    className: "bg-red-50 text-red-800 border-red-200",
    iconClassName: "text-red-400",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  },
  nextgen: {
    className: "bg-nextgen-blue/10 text-nextgen-blue-dark border-nextgen-blue/20",
    iconClassName: "text-nextgen-blue",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
      </svg>
    )
  }
};

const Alert = ({ 
  children, 
  title = null,
  variant = "info", 
  className = "",
  icon = true,
  dismissible = false,
  onDismiss = () => {},
  showIcon = true,
  customIcon = null,
  animate = true,
  ...props 
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const selectedVariant = variants[variant] || variants.info;
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };
  
  if (isDismissed) {
    return null;
  }
  
  const AlertComponent = animate ? motion.div : 'div';
  
  return (
    <AnimatePresence>
      <AlertComponent
        initial={animate ? { opacity: 0, y: -10 } : undefined}
        animate={animate ? { opacity: 1, y: 0 } : undefined}
        exit={animate ? { opacity: 0, height: 0 } : undefined}
        transition={{ duration: 0.3 }}
        className={`
          p-4 rounded-md border-l-4 flex items-start
          ${selectedVariant.className}
          ${className}
        `}
        {...props}
      >
        {showIcon && (
          <div className={`flex-shrink-0 mr-3 ${selectedVariant.iconClassName}`}>
            {customIcon || selectedVariant.icon}
          </div>
        )}
        
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">{title}</h3>
          )}
          <div className="text-sm">{children}</div>
        </div>
        
        {dismissible && (
          <button
            type="button"
            className={`ml-3 flex-shrink-0 inline-flex hover:bg-opacity-20 rounded p-1 ${selectedVariant.iconClassName}`}
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </AlertComponent>
    </AnimatePresence>
  );
};

Alert.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  variant: PropTypes.oneOf(['info', 'success', 'warning', 'error', 'nextgen']),
  className: PropTypes.string,
  icon: PropTypes.bool,
  dismissible: PropTypes.bool,
  onDismiss: PropTypes.func,
  showIcon: PropTypes.bool,
  customIcon: PropTypes.node,
  animate: PropTypes.bool
};

export default Alert;