import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { CHANGELOG, CURRENT_VERSION } from '../../utils/changelog';
import { 
  Bot, Users, Shield, Mail, Calendar, Library, ClipboardCheck, 
  UserCheck, Palette, Server, Bug, Zap, Smartphone, ScanLine, IdCard, ShieldCheck, Wrench,
  Settings, Sparkles, Code2, FileText, BarChart3, FilePenLine, Plug, KeyRound, Lock, Flame, Database, Rocket,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const ChangelogModal = ({ isOpen, onClose, version = CURRENT_VERSION }) => {
  const [selectedVersion, setSelectedVersion] = useState(version);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'timeline'
  const scrollContainerRef = useRef(null);
  
  // Memoize version data lookup
  const versionData = useMemo(() => 
    CHANGELOG.find(v => v.version === selectedVersion) || CHANGELOG[0],
    [selectedVersion]
  );

  const selectedVersionIndex = useMemo(
    () => CHANGELOG.findIndex((v) => v.version === selectedVersion),
    [selectedVersion]
  );

  // Update selected version when prop changes
  useEffect(() => {
    if (version) {
      setSelectedVersion(version);
      setViewMode('single');
    }
  }, [version]);

  // Scroll to top when view mode or selected version changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [viewMode, selectedVersion]);

  const getTypeBadge = (type) => {
    const types = {
      major: { variant: 'danger', label: 'Major Release' },
      minor: { variant: 'primary', label: 'Minor Update' },
      patch: { variant: 'secondary', label: 'Patch' },
      feature: { variant: 'success', label: 'New Feature' }
    };
    return types[type] || types.feature;
  };

  // Icon mapping for changelog categories
  const getIconComponent = (iconName, size = 'default') => {
    const iconMap = {
      'Bot': Bot,
      'Users': Users,
      'Shield': Shield,
      'Mail': Mail,
      'Calendar': Calendar,
      'Library': Library,
      'ClipboardCheck': ClipboardCheck,
      'UserCheck': UserCheck,
      'Palette': Palette,
      'Server': Server,
      'Bug': Bug,
      'Zap': Zap,
      'Smartphone': Smartphone,
      'ScanLine': ScanLine,
      'IdCard': IdCard,
      'ShieldCheck': ShieldCheck,
      'Wrench': Wrench,
      '⚙️': Settings,
      '⚡': Zap,
      '✨': Sparkles,
      '🎨': Palette,
      '🐛': Bug,
      '👥': Users,
      '👨‍👩‍👧‍👦': Users,
      '💻': Code2,
      '📄': FileText,
      '📅': Calendar,
      '📊': BarChart3,
      '📝': FilePenLine,
      '📧': Mail,
      '🔌': Plug,
      '🔐': KeyRound,
      '🔒': Lock,
      '🔥': Flame,
      '🗄️': Database,
      '🚀': Rocket
    };
    const IconComponent = iconMap[iconName];

    const sizeClass = size === 'small' ? 'w-4 h-4' : 'w-6 h-6';

    if (!IconComponent) {
      return (
        <div className="flex-shrink-0">
          <div className={`${sizeClass} rounded-full bg-nextgen-blue/10 text-nextgen-blue flex items-center justify-center text-[10px] font-bold`}>
            {String(iconName || '?').slice(0, 1)}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-shrink-0">
        <IconComponent className={`${sizeClass} text-nextgen-blue`} />
      </div>
    );
  };

  if (!isOpen) return null;

  const hasOlderVersion = selectedVersionIndex >= 0 && selectedVersionIndex < CHANGELOG.length - 1;
  const hasNewerVersion = selectedVersionIndex > 0;

  const goToOlderVersion = () => {
    if (!hasOlderVersion) return;
    setSelectedVersion(CHANGELOG[selectedVersionIndex + 1].version);
  };

  const goToNewerVersion = () => {
    if (!hasNewerVersion) return;
    setSelectedVersion(CHANGELOG[selectedVersionIndex - 1].version);
  };

  const getVersionOptionLabel = (entry) => {
    const raw = `v${entry.version} - ${entry.title}`;
    return raw.length > 42 ? `${raw.slice(0, 42)}...` : raw;
  };

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
          ref={scrollContainerRef}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative max-h-[92dvh] w-[calc(100vw-0.75rem)] max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:w-full"
        >
          {/* Header */}
          <div className="rounded-t-lg border-b border-gray-200 bg-gradient-to-r from-nextgen-blue to-nextgen-blue-dark px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                  <div className="rounded-xl bg-white/10 p-2.5 sm:p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <h2 className="text-5xl sm:text-2xl font-bold text-white leading-tight">
                        {viewMode === 'timeline' ? 'Patch History' : 'What\'s New'}
                      </h2>
                      {viewMode === 'single' && (
                        <Badge 
                          variant="white" 
                          size="sm" 
                          className="bg-white/20 text-white border-white/30 whitespace-nowrap shrink-0"
                        >
                          v{versionData.version}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-base sm:text-sm text-white/80 leading-snug pr-1 sm:pr-0">
                      {viewMode === 'timeline' 
                        ? `Complete history of all ${CHANGELOG.length} releases`
                        : versionData.title
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* View Mode Toggle & Version Selector */}
                <div className="mt-4 space-y-3">
                  <div className="inline-flex max-w-full items-center rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/90">
                    <span className="font-medium">Changelog</span>
                    <span className="mx-2 text-white/60">/</span>
                    <span className="font-medium">{viewMode === 'timeline' ? 'History' : 'Latest'}</span>
                    {viewMode === 'single' && (
                      <>
                        <span className="mx-2 text-white/60">/</span>
                        <span className="truncate">v{selectedVersion}</span>
                      </>
                    )}
                  </div>

                  <div className="grid gap-3 overflow-x-hidden sm:flex sm:items-center sm:justify-between">
                  {/* View Mode Toggle */}
                  <div className="flex gap-1 rounded-lg bg-white/10 p-1 w-full sm:w-auto">
                    <button
                      onClick={() => setViewMode('single')}
                      className={`
                        flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all
                        ${viewMode === 'single'
                          ? 'bg-white text-nextgen-blue shadow-sm'
                          : 'text-white hover:bg-white/10'
                        }
                      `}
                    >
                      Latest
                    </button>
                    <button
                      onClick={() => setViewMode('timeline')}
                      className={`
                        flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium transition-all
                        ${viewMode === 'timeline'
                          ? 'bg-white text-nextgen-blue shadow-sm'
                          : 'text-white hover:bg-white/10'
                        }
                      `}
                    >
                      History
                    </button>
                  </div>

                  {/* Version Navigator - Only show in single mode */}
                  {viewMode === 'single' && CHANGELOG.length > 1 && (
                    <div className="w-full sm:w-auto">
                      <div className="inline-flex w-full items-center overflow-hidden rounded-lg border border-white/35 bg-white/95 shadow-sm sm:w-auto">
                        <button
                          type="button"
                          onClick={goToOlderVersion}
                          disabled={!hasOlderVersion}
                          className="inline-flex h-9 w-11 items-center justify-center text-nextgen-blue-dark transition-colors hover:bg-nextgen-blue/10 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Go to older version"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="h-9 w-px bg-nextgen-blue/15" />

                        <select
                          value={selectedVersion}
                          onChange={(e) => setSelectedVersion(e.target.value)}
                          className="h-9 w-0 min-w-0 flex-1 truncate bg-transparent px-3 text-sm font-medium text-nextgen-blue-dark outline-none focus:bg-white sm:w-[320px] md:w-[380px]"
                        >
                          {CHANGELOG.map((v) => (
                            <option key={v.version} value={v.version}>
                              {getVersionOptionLabel(v)}
                            </option>
                          ))}
                        </select>

                        <div className="h-9 w-px bg-nextgen-blue/15" />

                        <button
                          type="button"
                          onClick={goToNewerVersion}
                          disabled={!hasNewerVersion}
                          className="inline-flex h-9 w-11 items-center justify-center text-nextgen-blue-dark transition-colors hover:bg-nextgen-blue/10 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Go to newer version"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </div>

              {/* Body - Scrollable */}
              <div className="p-4 sm:p-6">
                {viewMode === 'single' ? (
                  <>
                    {/* Single Version View */}
                    {/* Release Info */}
                    <div className="mb-6 border-b border-gray-200 pb-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Badge {...getTypeBadge(versionData.type)} size="md" className="whitespace-nowrap self-start">
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
                            <div className="flex-shrink-0">{getIconComponent(category.icon)}</div>
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
                  </>
                ) : (
                  <>
                    {/* Timeline View */}
                    <div className="space-y-8">
                      {CHANGELOG.map((version, versionIndex) => (
                        <motion.div
                          key={version.version}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: versionIndex * 0.1 }}
                          className="relative"
                        >
                          {/* Timeline Line */}
                          {versionIndex < CHANGELOG.length - 1 && (
                            <div className="absolute left-6 top-16 hidden h-full w-0.5 bg-gradient-to-b from-nextgen-blue/30 to-transparent sm:block"></div>
                          )}
                          
                          {/* Version Card */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                            {/* Timeline Dot */}
                            <div className="mt-1 flex flex-shrink-0 items-center gap-3 sm:mt-2 sm:block">
                              <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center shadow-lg
                                ${versionIndex === 0 
                                  ? 'bg-gradient-to-br from-nextgen-blue to-nextgen-blue-dark text-white' 
                                  : 'bg-white border-2 border-nextgen-blue/20 text-nextgen-blue'
                                }
                              `}>
                                <span className="text-sm font-bold">v{version.version}</span>
                              </div>
                              <div className="h-px flex-1 bg-nextgen-blue/20 sm:hidden" />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
                              {/* Version Header */}
                              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-3xl sm:text-xl font-bold text-gray-900 leading-tight">{version.title}</h3>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge {...getTypeBadge(version.type)} size="sm" className="whitespace-nowrap">
                                      {getTypeBadge(version.type).label}
                                    </Badge>
                                    <span className="text-sm text-gray-500">
                                      {new Date(version.date).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedVersion(version.version);
                                    setViewMode('single');
                                  }}
                                  className="flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-lg border border-nextgen-blue px-4 py-2 text-sm font-medium text-nextgen-blue transition-all hover:bg-nextgen-blue hover:text-white sm:w-auto"
                                >
                                  View Details
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                              
                              {/* Condensed Changes */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {version.changes.slice(0, 4).map((category, categoryIndex) => (
                                  <div key={categoryIndex} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      {getIconComponent(category.icon, 'small')}
                                      <span className="text-sm font-medium text-gray-900">{category.category}</span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      {category.updates.length} update{category.updates.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

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
              <div className="rounded-b-lg border-t border-gray-200 bg-gray-50 px-4 py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">NXTGen Ministry</span> · 
                    {viewMode === 'timeline' 
                      ? ` ${CHANGELOG.length} releases tracked`
                      : ` Version ${versionData.version}`
                    }
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
                    {viewMode === 'timeline' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto whitespace-nowrap"
                        onClick={() => {
                          setSelectedVersion(CURRENT_VERSION);
                          setViewMode('single');
                        }}
                      >
                        Latest Version
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={onClose}
                      className="w-full sm:w-auto whitespace-nowrap"
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
