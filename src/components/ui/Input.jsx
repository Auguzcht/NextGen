import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const Input = ({ 
  label,
  error,
  id,
  className = "",
  startIcon = null,
  endIcon = null,
  helperText = null,
  variant = "default",
  size = "md",
  fullWidth = true,
  animate = false,
  disabled = false,
  success = false,
  required = false,
  type = "text",
  options = [],  // Add options prop for select
  selectProps = {}, // Add selectProps
  onChange,
  onFocus,
  onBlur,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  
  const inputId = id || `nextgen-input-${Math.random().toString(36).substring(2, 9)}`;
  
  // Handle focus and blur events
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };
  
  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur && onBlur(e);
  };
  
  // Handle change to detect if input has value
  const handleChange = (e) => {
    setHasValue(!!e.target.value);
    onChange && onChange(e);
  };
  
  // Input variants
  const variants = {
    default: "border-gray-300",
    outline: "bg-transparent border-2 border-nextgen-blue/30 hover:border-nextgen-blue/50",
    filled: "bg-gray-100 border-transparent hover:bg-gray-200",
    flush: "border-0 border-b-2 rounded-none px-0 border-gray-300"
  };
  
  // Input sizes
  const sizes = {
    sm: "py-1 px-2 text-sm",
    md: "py-2 px-3 text-base",
    lg: "py-2.5 px-4 text-lg"
  };
  
  // Status classes
  const statusClasses = error 
    ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
    : success 
      ? "border-green-500 focus:ring-green-500 focus:border-green-500"
      : "focus:ring-nextgen-blue focus:border-nextgen-blue";
  
  // Container animation
  const containerAnimation = animate ? {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      } 
    }
  } : {};
  
  // Determine container component
  const Container = animate ? motion.div : 'div';
  
  return (
    <Container 
      className={`${fullWidth ? 'w-full' : 'w-auto'} mb-4 ${className}`}
      {...(animate ? {
        initial: "initial",
        animate: "animate",
        variants: containerAnimation
      } : {})}
    >
      {label && (
        <label 
          htmlFor={inputId} 
          className={`
            block text-sm font-medium mb-1 flex items-center
            ${disabled ? 'text-gray-400' : 'text-gray-700'}
            ${isFocused ? 'text-nextgen-blue' : ''}
            ${error ? 'text-red-600' : ''}
          `}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={`text-gray-500 ${isFocused ? 'text-nextgen-blue' : ''}`}>
              {startIcon}
            </span>
          </div>
        )}
        
        {type === 'select' ? (
          <select
            id={inputId}
            disabled={disabled}
            className={`
              block w-full h-[42px] rounded-md shadow-sm transition-colors duration-200
              border-gray-300 focus:border-nextgen-blue focus:ring-nextgen-blue
              disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
              text-gray-900 bg-white
              ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
              ${startIcon ? 'pl-10' : ''}
              ${endIcon ? 'pr-10' : ''}
              ${fullWidth ? 'w-full' : 'w-auto'}
            `}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...selectProps}
            {...props}
          >
            {options.map(option => (
              <option key={option.value} value={option.value} className="text-gray-900">
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}z
            type={type}
            disabled={disabled}
            className={`
              block border rounded-md shadow-sm transition-colors duration-200
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-20
              disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
              text-gray-900 bg-white
              ${startIcon ? 'pl-10' : ''}
              ${endIcon ? 'pr-10' : ''}
              ${variants[variant] || variants.default}
              ${sizes[size] || sizes.md}
              ${statusClasses}
              ${fullWidth ? 'w-full' : 'w-auto'}
              ${hasValue ? 'bg-white' : ''}
              ${isFocused ? 'ring-2 ring-opacity-20' : ''}
            `}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        )}
        
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <span className={`text-gray-500 ${isFocused ? 'text-nextgen-blue' : ''}`}>
              {endIcon}
            </span>
          </div>
        )}
        
        {/* Animated focus effect for filled variant */}
        {variant === 'filled' && isFocused && (
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-nextgen-blue"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
      
      {/* Error or helper text */}
      {error ? (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          {typeof error === 'string' ? error : 'Invalid input'}
        </p>
      ) : helperText && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      
      {/* Success message */}
      {success && !error && (
        <p className="mt-1 text-sm text-green-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {typeof success === 'string' ? success : 'Valid input'}
        </p>
      )}
    </Container>
  );
};

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  id: PropTypes.string,
  className: PropTypes.string,
  startIcon: PropTypes.node,
  endIcon: PropTypes.node,
  helperText: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'outline', 'filled', 'flush']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  animate: PropTypes.bool,
  disabled: PropTypes.bool,
  success: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  required: PropTypes.bool,
  type: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string,
      label: PropTypes.string
    })
  ),
  selectProps: PropTypes.object,
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func
};

export default Input;