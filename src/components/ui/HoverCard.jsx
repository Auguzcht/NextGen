import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const HoverCard = ({
  children,
  openDelay = 100,
  closeDelay = 100,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const openTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const clearTimers = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handleOpen = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => setOpen(true), openDelay);
  };

  const handleClose = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setOpen(false), closeDelay);
  };

  const updatePosition = (side = 'bottom') => {
    const node = triggerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const offset = 10;
    const maxLeft = window.innerWidth - 320;

    let top = rect.top;
    if (side === 'top') top = rect.top - offset;
    if (side === 'bottom') top = rect.bottom + offset;
    if (side === 'left' || side === 'right') top = rect.top + rect.height / 2;

    let left = rect.left + rect.width / 2;
    if (side === 'left') left = rect.left - offset;
    if (side === 'right') left = rect.right + offset;

    setPosition({
      top: Math.max(12, top),
      left: Math.min(Math.max(160, left), maxLeft),
    });
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    updatePosition('bottom');
    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open]);

  return children({ open, handleOpen, handleClose, triggerRef, position, updatePosition });
};

HoverCard.propTypes = {
  children: PropTypes.func.isRequired,
  openDelay: PropTypes.number,
  closeDelay: PropTypes.number,
};

export const HoverCardTrigger = ({ asChild = false, children, onHoverStart, onHoverEnd, triggerRef }) => {
  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      ref: triggerRef,
      onMouseEnter: onHoverStart,
      onMouseLeave: onHoverEnd,
      onFocus: onHoverStart,
      onBlur: onHoverEnd,
    });
  }

  return (
    <span
      ref={triggerRef}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      className="inline-block"
    >
      {children}
    </span>
  );
};

HoverCardTrigger.propTypes = {
  asChild: PropTypes.bool,
  children: PropTypes.node.isRequired,
  onHoverStart: PropTypes.func.isRequired,
  onHoverEnd: PropTypes.func.isRequired,
  triggerRef: PropTypes.shape({ current: PropTypes.any }),
};

export const HoverCardContent = ({ open, side = 'top', children, className = '', position }) => {
  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const transforms = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  const entranceBySide = {
    top: { x: '-50%', y: 4 },
    bottom: { x: '-50%', y: -4 },
    left: { x: 4, y: '-50%' },
    right: { x: -4, y: '-50%' },
  };

  const finalBySide = {
    top: { x: '-50%', y: 0 },
    bottom: { x: '-50%', y: 0 },
    left: { x: 0, y: '-50%' },
    right: { x: 0, y: '-50%' },
  };

  return createPortal(
    <motion.div
      className={`fixed z-[9999] w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg ${className}`}
      initial={{
        opacity: 0,
        scale: 0.98,
        ...(entranceBySide[side] || entranceBySide.top),
      }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(finalBySide[side] || finalBySide.top),
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        top: `${position?.top ?? 0}px`,
        left: `${position?.left ?? 0}px`,
        transform: transforms[side] || transforms.top,
      }}
    >
      {children}
    </motion.div>,
    document.body
  );
};

HoverCardContent.propTypes = {
  open: PropTypes.bool.isRequired,
  side: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  position: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
  }),
};
