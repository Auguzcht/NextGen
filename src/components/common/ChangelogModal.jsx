import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { CHANGELOG, CURRENT_VERSION } from '../../utils/changelog';

const ChangelogModal = ({ isOpen, onClose, version = CURRENT_VERSION }) => {
  const [selectedVersion, setSelectedVersion] = useState(version);
  
  // Memoize version data lookup
  const versionData = useMemo(() => 
    CHANGELOG.find(v => v.version === selectedVersion) || CHANGELOG[0],
    [selectedVersion]
  );

  // Update selected version when prop changes
  useEffect(() => {
    if (version) {
      setSelectedVersion(version);
    }
  }, [version]);

  const getTypeBadge = (type) => {
    const types = {
      major: { variant: 'danger', label: 'Major Release' },
      minor: { variant: 'primary', label: 'Minor Update' },
      patch: { variant: 'secondary', label: 'Patch' },
      feature: { variant: 'success', label: 'New Feature' }
    };
    return types[type] || types.feature;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-nextgen-blue to-nextgen-blue-dark px-6 py-5 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">What's New</h2>
                      <Badge 
                        variant="white" 
                        size="sm" 
                        className="bg-white/20 text-white border-white/30"
                      >
                        v{versionData.version}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/80 mt-1">{versionData.title}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Version Selector */}
                {CHANGELOG.length > 1 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {CHANGELOG.map((v) => (
                      <button
                        key={v.version}
                        onClick={() => setSelectedVersion(v.version)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                          ${selectedVersion === v.version
                            ? 'bg-white text-nextgen-blue shadow-md'
                            : 'bg-white/10 text-white hover:bg-white/20'
                          }
                        `}
                      >
                        v{v.version}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Body - Scrollable */}
              <div className="p-6">
                {/* Release Info */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Badge {...getTypeBadge(versionData.type)} size="md">
                      {getTypeBadge(versionData.type).label}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Released on {new Date(versionData.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>

                {/* Changes by Category */}
                <div className="space-y-6">
                  {versionData.changes.map((category, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-3xl">{category.icon}</div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.category}
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {category.updates.map((update, updateIndex) => (
                          <motion.li
                            key={updateIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (index * 0.1) + (updateIndex * 0.05) }}
                            className="flex items-start gap-3 text-gray-700"
                          >
                            <div className="mt-1 flex-shrink-0">
                              <div className="h-5 w-5 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
                                <svg className="h-3 w-3 text-nextgen-blue" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <span className="flex-1 leading-relaxed">{update}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>

                {/* Appreciation Message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 p-5 bg-gradient-to-r from-nextgen-blue/5 to-nextgen-orange/5 border border-nextgen-blue/20 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-2xl">💙</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Thank You!</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        We're constantly working to improve NextGen Ministry Management System. Your feedback and support help us build better tools for ministry management. If you have suggestions or encounter any issues, please contact your system administrator.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">NextGen Ministry</span> · Version {versionData.version}
                  </div>
                  <Button
                    variant="primary"
                    onClick={onClose}
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    }
                  >
                    Got It!
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
  );
};

ChangelogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  version: PropTypes.string
};

export default ChangelogModal;
