import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { format, isValid, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import Calendar from './Calendar';

const DatePickerOverlay = ({
  id,
  value,
  onChange,
  disabled = false,
  className = '',
  minDate,
  maxDate,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const overlayRef = useRef(null);

  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const displayValue = selectedDate ? format(selectedDate, 'PPP') : 'Pick a date';

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  useEffect(() => {
    const updateViewportState = () => setIsMobile(window.innerWidth < 768);
    updateViewportState();
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, []);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();

    setPosition({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 332)),
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open || isMobile) return undefined;

    updatePosition();
    const handleWindowChange = () => updatePosition();

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (overlayRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setIsFocused(false);
    setOpen(false);
  };

  const handleDrawerDragEnd = (_, info) => {
    const shouldClose = info.offset.y > 120 || info.velocity.y > 700;
    if (shouldClose) {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={`relative flex h-[42px] w-full items-center justify-between rounded-md !border ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-nextgen-blue focus:border-nextgen-blue'} bg-white px-3 text-left text-base md:text-sm text-gray-900 shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 ${isFocused && !error ? 'ring-2 ring-opacity-20 ring-nextgen-blue' : ''} ${isFocused && error ? 'ring-2 ring-opacity-20 ring-red-500' : ''} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate">{displayValue}</span>
        <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
        </svg>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  className={`fixed inset-0 z-[120000] ${isMobile ? 'bg-black/35 backdrop-blur-[1px]' : 'bg-transparent'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  ref={overlayRef}
                  className={`fixed z-[120001] ${isMobile ? 'inset-x-0 bottom-0 p-3 pb-4' : ''}`}
                  style={
                    isMobile
                      ? { touchAction: 'none' }
                      : {
                          top: `${position.top}px`,
                          left: `${position.left}px`,
                          minWidth: `${Math.max(position.width, 312)}px`,
                        }
                  }
                  drag={isMobile ? 'y' : false}
                  dragDirectionLock
                  dragElastic={isMobile ? 0.2 : 0}
                  dragMomentum={false}
                  dragConstraints={isMobile ? { top: 0, bottom: 280 } : undefined}
                  onDragEnd={isMobile ? handleDrawerDragEnd : undefined}
                  initial={isMobile ? { opacity: 0, y: 22 } : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={isMobile ? { opacity: 0, y: 22 } : { opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <div className={isMobile ? 'mx-auto flex w-full max-w-[420px] flex-col items-center rounded-2xl border border-gray-300 bg-white p-2 shadow-2xl' : ''}>
                    {isMobile && (
                      <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-gray-300" aria-hidden="true" />
                    )}
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleSelect}
                      captionLayout="buttons"
                      minDate={minDate}
                      maxDate={maxDate}
                      className={isMobile ? 'mx-auto rounded-lg border-0 shadow-none' : 'rounded-lg border border-gray-300'}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

DatePickerOverlay.propTypes = {
  id: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  minDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  maxDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export default DatePickerOverlay;
