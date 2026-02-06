/**
 * NextGen AI Event Logger
 * Captures user interactions for state-aware AI assistance
 * Architecture: Events → State → Intent → AI Response
 */

import supabase from './supabase';

let currentSessionId = null;
let pageStartTime = Date.now();
let currentPage = window.location.pathname;

/**
 * Initialize event logger with session ID
 */
export const initEventLogger = (sessionId) => {
  currentSessionId = sessionId;
  // console.log('[EventLogger] Initialized with session:', sessionId);
};

/**
 * Set current session ID (when chat session created)
 */
export const setSessionId = (sessionId) => {
  currentSessionId = sessionId;
};

/**
 * Log an event to Supabase
 */
export const logEvent = async (eventType, { page, component, payload = {} } = {}) => {
  try {
    // Get current staff info from Supabase session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // console.warn('[EventLogger] No authenticated user - skipping event log');
      return;
    }

    // Get staff_id from staff table
    const { data: staffData } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('email', user.email)
      .single();

    if (!staffData) {
      // console.warn('[EventLogger] Staff record not found');
      return;
    }

    const eventData = {
      staff_id: staffData.staff_id,
      session_id: currentSessionId,
      event_type: eventType,
      page: page || currentPage,
      component: component || null,
      payload: payload,
    };

    const { error } = await supabase
      .from('ai_user_events')
      .insert(eventData);

    if (error) {
      // console.error('[EventLogger] Failed to log event:', error);
    } else {
      // console.log(`[EventLogger] ${eventType}:`, { page: eventData.page, component, payload });
    }
  } catch (err) {
    // console.error('[EventLogger] Error logging event:', err);
  }
};

/**
 * Track page views automatically
 */
export const trackPageView = (path) => {
  // Log duration on previous page if we were tracking one
  if (currentPage && pageStartTime) {
    const durationSeconds = Math.floor((Date.now() - pageStartTime) / 1000);
    if (durationSeconds > 1) { // Only log if spent more than 1 second
      logEvent('page_duration', {
        page: currentPage,
        payload: { seconds: durationSeconds }
      });
    }
  }

  // Update current page and start time
  currentPage = path;
  pageStartTime = Date.now();

  // Log new page view
  logEvent('page_view', { page: path });
};

/**
 * Track clicks on important components
 */
export const trackClick = (componentName, additionalPayload = {}) => {
  logEvent('click', {
    component: componentName,
    payload: additionalPayload
  });
};

/**
 * Track form submissions
 */
export const trackSubmit = (formName, additionalPayload = {}) => {
  logEvent('submit', {
    component: formName,
    payload: additionalPayload
  });
};

/**
 * Track errors
 */
export const trackError = (errorMessage, errorStack = null) => {
  logEvent('error', {
    payload: {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Track back navigation
 */
export const trackBackNavigation = () => {
  logEvent('nav_back', { page: currentPage });
};

/**
 * Setup global error listener
 */
export const setupGlobalErrorTracking = () => {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    trackError(event.message, event.error?.stack);
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError(`Unhandled Promise Rejection: ${event.reason}`);
  });

  // console.log('[EventLogger] Global error tracking enabled');
};

/**
 * Setup navigation tracking (back button)
 */
export const setupNavigationTracking = () => {
  window.addEventListener('popstate', () => {
    trackBackNavigation();
    trackPageView(window.location.pathname);
  });

  // console.log('[EventLogger] Navigation tracking enabled');
};

/**
 * Track page unload (when user leaves)
 */
export const setupUnloadTracking = () => {
  window.addEventListener('beforeunload', () => {
    if (currentPage && pageStartTime) {
      const durationSeconds = Math.floor((Date.now() - pageStartTime) / 1000);
      if (durationSeconds > 1) {
        // Use sendBeacon for reliable unload logging
        const eventData = {
          staff_id: null, // Will need to get from session
          session_id: currentSessionId,
          event_type: 'page_duration',
          page: currentPage,
          payload: { seconds: durationSeconds }
        };
        
        // Attempt to send (best effort)
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/ai_user_events`,
          JSON.stringify(eventData)
        );
      }
    }
  });

  console.log('[EventLogger] Unload tracking enabled');
};

/**
 * Initialize all tracking
 */
export const initializeTracking = () => {
  setupGlobalErrorTracking();
  setupNavigationTracking();
  setupUnloadTracking();
  trackPageView(window.location.pathname);
  
  // console.log('[EventLogger] All tracking initialized');
};

export default {
  initEventLogger,
  setSessionId,
  logEvent,
  trackPageView,
  trackClick,
  trackSubmit,
  trackError,
  trackBackNavigation,
  initializeTracking,
};
