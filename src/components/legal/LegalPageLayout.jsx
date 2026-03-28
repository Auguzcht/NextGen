import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { BookOpen, ArrowUp, Menu } from 'lucide-react';
import LegalMobileSidebar from './LegalMobileSidebar.jsx';

const NextGenLogo = `${import.meta.env.BASE_URL}NextGen-Logo.png`;

const LegalPageLayout = ({
  title,
  subtitle,
  lastUpdated,
  sections,
  children,
}) => {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [linePosition, setLinePosition] = useState({ top: 0, height: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  const navRef = useRef(null);
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 500], [0, 150]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll-to-top button visibility
  useEffect(() => {
    // Check initial scroll position
    setShowScrollTop(window.scrollY > 150);

    const handleScroll = () => {
      // Show button after scrolling down 150px (lower threshold for easy testing)
      setShowScrollTop(window.scrollY > 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Use Intersection Observer for section tracking
  useEffect(() => {
    // Create observers for each section
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -70% 0px', // Trigger when section is 30% from top
      threshold: 0,
    };

    const observerCallback = (entries) => {
      // Find which section is most visible
      let maxVisibleSection = null;
      let maxVisibleRatio = 0;

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxVisibleRatio) {
          maxVisibleRatio = entry.intersectionRatio;
          maxVisibleSection = entry.target.id;
        }
      });

      // If a section is intersecting, update active section
      if (maxVisibleSection) {
        setActiveSection(maxVisibleSection);
        
        // Auto-scroll sidebar to show active item
        if (sidebarRef.current) {
          const activeLink = sidebarRef.current.querySelector(`a[href="#${maxVisibleSection}"]`);
          if (activeLink) {
            activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  // Measure active item position dynamically
  useEffect(() => {
    if (!navRef.current || !activeSection) return;

    const activeLink = navRef.current.querySelector(`a[href="#${activeSection}"]`);
    if (!activeLink) return;

    // Get position relative to nav container
    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    
    const relativeTop = linkRect.top - navRect.top + navRef.current.scrollTop;
    const height = linkRect.height;

    setLinePosition({ top: relativeTop, height });
  }, [activeSection]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSectionClick = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      // Start scroll with delay
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(sectionId);
      }, 100);
    }
  };

  // Enhanced styles for child sections
  const sectionStyles = `
    section[id] {
      transition: all 0.3s ease;
      border-radius: 1rem;
      padding: 2rem;
      margin: 0;
    }
    
    section[id]:hover {
      box-shadow: 0 20px 40px rgba(59, 130, 246, 0.08);
      transform: translateY(-2px);
      border-color: rgba(59, 130, 246, 0.2);
    }
    
    section[id] h1, section[id] h2, section[id] h3 {
      margin-bottom: 1rem;
    }
    
    section[id] > div {
      transition: background-color 0.3s ease;
    }
  `;

  return (
    <>
      <style>{sectionStyles}</style>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-nextgen-blue-light/30 via-white to-nextgen-orange-light/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 border-b border-gray-200/50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <img src={NextGenLogo} alt="NextGen" className="h-9 w-auto" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-nextgen-blue-dark">NXTGen Ministry</p>
              <p className="text-xs text-gray-600">Christ Commission Fellowship (CCF)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            {isMobile && (
              <motion.button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-nextgen-blue-light/10 text-nextgen-blue-dark hover:bg-nextgen-blue-light/20 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="h-5 w-5" />
              </motion.button>
            )}

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-nextgen-blue-light/10 px-4 py-2 text-sm font-medium text-nextgen-blue-dark transition-all hover:bg-nextgen-blue-light/20"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <motion.div
        className="sticky top-16 h-1 bg-gradient-to-r from-nextgen-blue-dark via-nextgen-blue to-nextgen-blue-light z-30"
        initial={{ width: '0%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[280px,1fr] md:px-8 md:py-10">
          {/* Desktop Sidebar Navigation */}
          <motion.aside
            ref={sidebarRef}
            className="hidden lg:block h-fit rounded-2xl border border-gray-200/50 bg-white/70 backdrop-blur-sm shadow-lg lg:sticky lg:top-24 overflow-y-auto max-h-[calc(100vh-120px)]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="p-6">
              <motion.div 
                className="mb-5 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <BookOpen className="h-5 w-5 text-nextgen-blue-dark" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-700">Sections</p>
              </motion.div>

              <nav className="space-y-1 relative" ref={navRef}>
                {/* Vertical line background */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200/50 rounded-full" />

                {/* Active indicator line */}
                <motion.div
                  className="absolute left-5 w-0.5 bg-nextgen-blue rounded-full"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ 
                    opacity: 1, 
                    height: linePosition.height,
                    top: linePosition.top
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />

                {sections.map((section, idx) => {
                  const isActive = activeSection === section.id;
                  return (
                    <motion.a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={(e) => handleSectionClick(e, section.id)}
                      data-active={isActive}
                      className={`group relative flex items-center gap-2 rounded-lg px-3 py-2.5 pl-12 text-sm font-medium transition-all overflow-hidden cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-nextgen-blue-light/30 to-nextgen-blue-light/10 text-nextgen-blue-dark shadow-lg shadow-nextgen-blue-light/20'
                          : 'text-gray-700 hover:bg-gray-100/50'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Active indicator dot on line */}
                      <motion.div
                        className="absolute left-3.5 h-3 w-3 rounded-full bg-nextgen-blue-dark"
                        animate={{
                          scale: isActive ? 1.2 : 0.8,
                          opacity: isActive ? 1 : 0.4,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />

                      <span className="flex-1">{section.label.split('.')[1]?.trim() || section.label}</span>
                    </motion.a>
                  );
                })}
              </nav>
            </div>
          </motion.aside>

          {/* Main Content with Parallax */}
          <motion.main
            ref={mainRef}
            className="rounded-2xl border border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ y: parallaxY }}
          >
            {/* Parallax Background Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-nextgen-blue-light/5 via-transparent to-nextgen-orange-light/5 pointer-events-none"
              style={{ y: parallaxY }}
            />

            {/* Header */}
            <div className="relative z-10 border-b border-gray-200/50 bg-gradient-to-r from-nextgen-blue-light/10 via-transparent to-nextgen-orange-light/10 px-6 py-10 md:px-10 md:py-12">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-3 inline-block rounded-full bg-nextgen-blue-light/20 px-3 py-1"
              >
                <p className="text-xs font-semibold text-nextgen-blue-dark uppercase tracking-wide">Legal Documentation</p>
              </motion.div>

              <motion.h1 
                className="bg-gradient-to-r from-nextgen-blue-dark to-nextgen-blue via-nextgen-blue-dark bg-clip-text text-3xl font-bold text-transparent md:text-4xl"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {title}
              </motion.h1>

              <motion.p 
                className="mt-3 text-base text-gray-700"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {subtitle}
              </motion.p>

              <motion.div 
                className="mt-5 flex items-center justify-between border-t border-gray-200/50 pt-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                <p className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />
                  Last updated: <span className="font-semibold">{lastUpdated}</span>
                </p>
                <p className="text-xs text-gray-500">{sections.length} sections</p>
              </motion.div>
            </div>

            {/* Content with Staggered Animation */}
            <div className="relative z-10 space-y-10 px-6 py-10 md:px-10 md:py-12">
              {children}
            </div>

            {/* Footer with Scroll to Top */}
            <div className="border-t border-gray-200/50 bg-gradient-to-r from-nextgen-blue-light/5 via-transparent to-nextgen-orange-light/5 px-6 py-8 md:px-10">
              <div className="flex items-center justify-between">
                <div className="max-w-2xl">
                  <h3 className="mb-2 text-sm font-semibold text-nextgen-blue-dark">Questions?</h3>
                  <p className="text-sm text-gray-700">
                    If you have questions about this policy, please contact us at{' '}
                    <a
                      href="mailto:info@nextgen-ccf.org"
                      className="font-semibold text-nextgen-blue-dark underline underline-offset-2 hover:text-nextgen-blue-light transition-colors"
                    >
                      info@nextgen-ccf.org
                    </a>
                  </p>
                </div>
                
                {/* Scroll to Top Button */}
                <motion.button
                  onClick={scrollToTop}
                  className="flex-shrink-0 ml-4 p-3 rounded-lg bg-gradient-to-br from-nextgen-blue-dark to-nextgen-blue text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                  animate={{ 
                    opacity: showScrollTop ? 1 : 0,
                    scale: showScrollTop ? 1 : 0.5,
                    y: showScrollTop ? 0 : 20
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!showScrollTop}
                  style={{ 
                    pointerEvents: showScrollTop ? 'auto' : 'none',
                    visibility: showScrollTop ? 'visible' : 'hidden'
                  }}
                  title="Scroll to top"
                  aria-label="Scroll to top"
                >
                  <ArrowUp className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          </motion.main>
        </div>
      </div>
      </motion.div>

      {/* Mobile Sidebar */}
      <LegalMobileSidebar
        sections={sections}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
};

LegalPageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  lastUpdated: PropTypes.string.isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  children: PropTypes.node.isRequired,
};

export default LegalPageLayout;
