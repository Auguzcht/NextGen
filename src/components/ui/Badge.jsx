import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const variants = {
  primary: "bg-nextgen-blue/20 text-nextgen-blue-dark border border-nextgen-blue/20",
  secondary: "bg-nextgen-orange/20 text-nextgen-orange-dark border border-nextgen-orange/20",
  success: "bg-green-100 text-green-800 border border-green-200",
  error: "bg-red-100 text-red-800 border border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  info: "bg-blue-100 text-blue-800 border border-blue-200",
  neutral: "bg-gray-100 text-gray-800 border border-gray-200",
  purple: "bg-purple-100 text-purple-800 border border-purple-200",
  teal: "bg-teal-100 text-teal-800 border border-teal-200",
  pink: "bg-pink-100 text-pink-800 border border-pink-200",
};

const sizes = {
  xs: "text-xxs px-1.5 py-0.5",
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1"
};

const shapes = {
  rounded: "rounded-full",
  square: "rounded-md"
};

const Badge = ({ 
  children, 
  variant = "primary", 
  size = "sm",
  shape = "rounded",
  className = "",
  animate = false,
  icon = null,
  dismissible = false,
  onDismiss = () => {},
  pulsing = false,
  dot = false,
  ...props 
}) => {
  // Determine if we're using motion
  const Component = animate ? motion.span : 'span';
  
  // Animation variants
  const badgeVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25
      }
    },
    exit: { 
      scale: 0.8, 
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };
  
  // Pulse animation for the dot
  const pulseAnimation = pulsing ? {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "loop"
      }
    }
  } : {};
  
  return (
    <Component
      className={`
        inline-flex items-center font-medium
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.sm}
        ${shapes[shape] || shapes.rounded}
        ${className}
      `}
      {...(animate ? {
        initial: "initial",
        animate: "animate",
        exit: "exit",
        variants: badgeVariants
      } : {})}
      {...props}
    >
      {/* Status dot indicator */}
      {dot && (
        <motion.span 
          className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${variant === 'primary' ? 'bg-nextgen-blue' : variant === 'secondary' ? 'bg-nextgen-orange' : `bg-${variant}-500`}`}
          {...(pulsing ? {
            animate: "animate",
            variants: pulseAnimation
          } : {})}
        />
      )}
      
      {/* Optional icon */}
      {icon && (
        <span className="mr-1 -ml-0.5 flex-shrink-0">
          {icon}
        </span>
      )}
      
      {/* Badge content */}
      <span>{children}</span>
      
      {/* Dismissible X button */}
      {dismissible && (
        <button
          type="button"
          className="flex-shrink-0 ml-1 -mr-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center focus:outline-none focus:text-gray-500 hover:bg-gray-200 hover:bg-opacity-20"
          onClick={onDismiss}
          aria-label="Remove badge"
        >
          <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </Component>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf([
    'primary', 'secondary', 'success', 'error', 
    'warning', 'info', 'neutral', 'purple', 'teal', 'pink'
  ]),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  shape: PropTypes.oneOf(['rounded', 'square']),
  className: PropTypes.string,
  animate: PropTypes.bool,
  icon: PropTypes.node,
  dismissible: PropTypes.bool,
  onDismiss: PropTypes.func,
  pulsing: PropTypes.bool,
  dot: PropTypes.bool
};

export default Badge;