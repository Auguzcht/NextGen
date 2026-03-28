import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BookOpen, X, ChevronRight } from 'lucide-react';

const LegalMobileSidebar = ({
  sections,
  activeSection,
  onSectionClick,
  isOpen,
  onClose,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSectionClick = (e, sectionId) => {
    onSectionClick(e, sectionId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && isMobile && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Mobile Sidebar */}
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: -320, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x < -100 || velocity.x < -500) {
                onClose();
              }
            }}
            className="fixed z-50 h-screen left-0 top-0 bottom-0 w-80 overflow-hidden lg:hidden
              bg-gradient-to-b from-white via-gray-50 to-gray-100 shadow-2xl"
          >
            {/* Swipe handle */}
            <motion.div
              className="absolute top-1/2 right-2 transform -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-nextgen-blue-light/20 to-nextgen-blue/10 rounded-full"
              animate={{
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Header with gradient background */}
            <div className="relative overflow-hidden border-b border-gray-200/50 bg-gradient-to-br from-nextgen-blue-light/10 via-transparent to-nextgen-orange-light/10 px-6 py-6">
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-nextgen-blue-light/5 rounded-full -mr-16 -mt-16" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-nextgen-blue-light/20">
                    <BookOpen className="h-5 w-5 text-nextgen-blue-dark" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-nextgen-blue-dark">Quick Navigation</p>
                    <p className="text-xs text-gray-600">{sections.length} sections</p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-200/50 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5 text-gray-700" />
                </motion.button>
              </div>
            </div>

            {/* Navigation with card-like items */}
            <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
              {sections.map((section, idx) => {
                const isActive = activeSection === section.id;
                return (
                  <motion.a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => handleSectionClick(e, section.id)}
                    className={`group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-nextgen-blue-light/25 to-nextgen-blue/15 text-nextgen-blue-dark shadow-md border border-nextgen-blue-light/30'
                        : 'text-gray-700 hover:bg-gray-200/30'
                    }`}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="h-2 w-2 rounded-full bg-nextgen-blue-dark"
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        />
                      )}
                      {!isActive && <div className="h-2 w-2 rounded-full bg-gray-300/50" />}
                      <span className="truncate">{section.label.split('.')[1]?.trim() || section.label}</span>
                    </div>
                    <motion.div
                      animate={{ x: isActive ? 4 : 0, opacity: isActive ? 1 : 0.3 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <ChevronRight className={`h-4 w-4 ${isActive ? 'text-nextgen-blue-dark' : 'text-gray-400'}`} />
                    </motion.div>
                  </motion.a>
                );
              })}
            </nav>

            {/* Footer divider and info */}
            <motion.div
              className="border-t border-gray-200/50 bg-gradient-to-t from-gray-100 to-transparent px-6 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-gray-600 text-center">
                <span className="font-semibold text-nextgen-blue-dark">NXTGen Ministry</span>
                <br />
                Legal Documentation
              </p>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

LegalMobileSidebar.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeSection: PropTypes.string.isRequired,
  onSectionClick: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LegalMobileSidebar;
