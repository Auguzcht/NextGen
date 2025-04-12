import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const sizes = {
  xs: "h-3 w-3 border-2",
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-3",
  lg: "h-12 w-12 border-3",
  xl: "h-16 w-16 border-4"
};

const variants = {
  primary: "border-nextgen-blue",
  secondary: "border-nextgen-orange",
  white: "border-white",
  light: "border-gray-300",
  dark: "border-gray-700",
};

const styles = {
  border: "rounded-full border-t-transparent border-l-transparent",
  dots: "flex space-x-1 items-center",
  pulse: "flex items-center",
  fade: "flex space-x-1 items-center",
  bars: "flex space-x-1 h-full items-end"
};

const Spinner = ({ 
  size = "md", 
  variant = "primary",
  type = "border",
  className = "",
  fullWidth = false,
  label = "",
  labelPosition = "right",
  ...props 
}) => {
  // For pulse animation
  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.4, 1, 0.4],
      transition: {
        times: [0, 0.5, 1],
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  
  // For fading dots animation
  const fadeVariants = {
    animate: i => ({
      opacity: [0.4, 1, 0.4],
      transition: {
        times: [0, 0.5, 1],
        duration: 1.5,
        repeat: Infinity,
        delay: i * 0.15,
        ease: "easeInOut"
      }
    })
  };
  
  // For bars animation
  const barVariants = {
    animate: i => ({
      height: ["40%", "100%", "40%"],
      transition: {
        times: [0, 0.5, 1],
        duration: 1,
        repeat: Infinity,
        delay: i * 0.1,
        ease: "easeInOut"
      }
    })
  };
  
  // For rotating border 
  const borderVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const colorClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;
  
  // Helper to render label
  const renderLabel = () => {
    if (!label) return null;
    
    return (
      <span className={`text-${variant === 'white' ? 'white' : 'gray-700'} text-sm font-medium ml-2`}>
        {label}
      </span>
    );
  };
  
  // Render different spinner types
  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <div className={styles.dots}>
            {[0, 1, 2].map(i => (
              <motion.div 
                key={i}
                className={`${colorClass} rounded-full ${
                  size === 'xs' ? 'h-1.5 w-1.5' : 
                  size === 'sm' ? 'h-2 w-2' : 
                  size === 'md' ? 'h-3 w-3' : 
                  size === 'lg' ? 'h-4 w-4' : 'h-5 w-5'
                }`}
                variants={fadeVariants}
                animate="animate"
                custom={i}
              />
            ))}
          </div>
        );
        
      case 'pulse':
        return (
          <div className={styles.pulse}>
            <motion.div 
              className={`${colorClass} rounded-full ${sizeClass}`}
              variants={pulseVariants}
              animate="animate"
            />
          </div>
        );
        
      case 'fade':
        return (
          <div className={styles.fade}>
            {[0, 1, 2].map(i => (
              <motion.div 
                key={i}
                className={`${colorClass} rounded-full ${
                  size === 'xs' ? 'h-1.5 w-1.5' : 
                  size === 'sm' ? 'h-2 w-2' : 
                  size === 'md' ? 'h-3 w-3' : 
                  size === 'lg' ? 'h-4 w-4' : 'h-5 w-5'
                }`}
                variants={fadeVariants}
                animate="animate"
                custom={i}
              />
            ))}
          </div>
        );
        
      case 'bars':
        return (
          <div className={styles.bars}>
            {[0, 1, 2, 3].map(i => (
              <motion.div 
                key={i}
                className={`${colorClass} ${
                  size === 'xs' ? 'w-1 mx-px' : 
                  size === 'sm' ? 'w-1.5 mx-px' : 
                  size === 'md' ? 'w-2 mx-0.5' : 
                  size === 'lg' ? 'w-2.5 mx-0.5' : 'w-3 mx-1'
                }`}
                style={{ height: "40%" }}
                variants={barVariants}
                animate="animate"
                custom={i}
              />
            ))}
          </div>
        );
        
      case 'border':
      default:
        return (
          <motion.div 
            className={`${styles.border} ${colorClass} ${sizeClass}`}
            variants={borderVariants}
            animate="animate"
          />
        );
    }
  };
  
  return (
    <div 
      className={`
        flex ${labelPosition === 'bottom' ? 'flex-col' : 'items-center'}
        ${fullWidth ? 'w-full justify-center' : 'inline-flex'}
        ${className}
      `} 
      {...props}
    >
      {renderSpinner()}
      {labelPosition === 'right' && renderLabel()}
      {labelPosition === 'bottom' && label && (
        <span className={`text-${variant === 'white' ? 'white' : 'gray-700'} text-sm font-medium mt-2`}>
          {label}
        </span>
      )}
    </div>
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'white', 'light', 'dark']),
  type: PropTypes.oneOf(['border', 'dots', 'pulse', 'fade', 'bars']),
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
  label: PropTypes.string,
  labelPosition: PropTypes.oneOf(['right', 'bottom'])
};

export default Spinner;