/**
 * NextGen AI Chat Widget - Main Component
 * Bottom-right overlay chatbot with NextGen styling
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Loader2, 
  Bot,
  Minimize2,
  Maximize2,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import supabase from '../../services/supabase.js';
import ChatMessage from './ChatMessage.jsx';
import { 
  initializeTracking, 
  setSessionId as setEventSessionId,
  trackPageView,
  trackClick 
} from '../../services/eventLogger.js';
import './AIChatWidget.css';

const AIChatWidget = () => {
  const { user, staffProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [proactiveMessage, setProactiveMessage] = useState(null); // NEW: Proactive trigger message
  const [lastProactiveTrigger, setLastProactiveTrigger] = useState(null); // Prevent duplicate triggers
  const [showScrollButton, setShowScrollButton] = useState(false); // Show scroll-to-bottom button
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Session storage key (includes auth state to prevent cross-session restoration)
  const STORAGE_KEY = `nextgen_ai_chat_${user?.staff_id || user?.id || 'guest'}_${user?.email || 'anon'}`;
  const SESSION_VALID_KEY = `nextgen_ai_session_valid_${user?.staff_id || user?.id || 'guest'}`;

  // Initialize event tracking on mount
  useEffect(() => {
    initializeTracking();
    // console.log('[AIChatWidget] Event tracking initialized');
  }, []);

  // Clear chat history when user logs out (detect user change)
  useEffect(() => {
    if (!user) {
      // User logged out - clear all chat data
      // console.log('[AIChatWidget] User logged out - clearing chat history');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_VALID_KEY);
      setMessages([]);
      setSessionId(null);
      setInputValue('');
    } else {
      // User logged in - check if this is a new session
      const isValidSession = localStorage.getItem(SESSION_VALID_KEY);
      if (!isValidSession) {
        // First login or session expired - clear old data
        // console.log('[AIChatWidget] New login detected - clearing old session');
        localStorage.removeItem(STORAGE_KEY);
        setMessages([]);
        setSessionId(null);
      }
      // Mark session as valid
      localStorage.setItem(SESSION_VALID_KEY, 'true');
    }
  }, [user, STORAGE_KEY, SESSION_VALID_KEY]);

  // Load session from localStorage on mount (ONLY if session is valid)
  useEffect(() => {
    const isValidSession = localStorage.getItem(SESSION_VALID_KEY);
    if (!isValidSession || !user) {
      // No valid session or not logged in - don't restore
      // console.log('[AIChatWidget] No valid session - starting fresh');
      return;
    }

    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        
        // Check if session is recent (within 24 hours)
        const lastUpdated = new Date(parsed.lastUpdated);
        const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          // console.log('[AIChatWidget] Restoring recent session');
          setMessages(parsed.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
          setSessionId(parsed.sessionId);
        } else {
          // console.log('[AIChatWidget] Session too old - starting fresh');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        // console.error('Failed to parse saved session:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [STORAGE_KEY, SESSION_VALID_KEY, user]);

  // Save session to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const session = {
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        })),
        sessionId: sessionId || Date.now(),
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      if (!sessionId) {
        const newSessionId = session.sessionId;
        setSessionId(newSessionId);
        setEventSessionId(newSessionId); // Link session to event logger
      }
    }
  }, [messages, STORAGE_KEY, sessionId]);

  // Track page changes (for context awareness)
  useEffect(() => {
    const handleLocationChange = () => {
      trackPageView(window.location.pathname);
    };

    // Track initial page
    trackPageView(window.location.pathname);

    // Listen for route changes (React Router or native navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // PROACTIVE POLLING (Todo 8) - Check for stuck users every 30 seconds
  useEffect(() => {
    if (!user?.staff_id) return;

    const checkProactiveTriggers = async () => {
      try {
        const { data } = await supabase.functions.invoke('ai-chat-check', {
          body: { staffId: user.staff_id }
        });

        if (data?.triggers && data.triggers.length > 0) {
          const trigger = data.triggers[0];
          
          // Prevent duplicate triggers
          if (trigger.type !== lastProactiveTrigger) {
            // console.log('[Proactive Trigger]', trigger.type, trigger.message);
            setProactiveMessage(trigger.message);
            setLastProactiveTrigger(trigger.type);

            // Execute action if provided
            if (trigger.action) {
              executeAction(trigger.action);
            }

            // Auto-open chat if high priority
            if (trigger.priority === 'high' && !isOpen) {
              setIsOpen(true);
              
              // Add proactive message to chat
              const proactiveMsg = {
                id: Date.now(),
                role: 'assistant',
                content: trigger.message,
                timestamp: new Date(),
                isProactive: true,
              };
              setMessages(prev => [...prev, proactiveMsg]);
            }
          }
        }
      } catch (error) {
        // console.error('[Proactive Check] Error:', error);
      }
    };

    // Check immediately, then every 30 seconds
    checkProactiveTriggers();
    const interval = setInterval(checkProactiveTriggers, 30000);

    return () => clearInterval(interval);
  }, [user?.staff_id, isOpen, lastProactiveTrigger]);

  // ACTION EXECUTOR (Todo 7) - Handle AI-suggested actions
  const executeAction = (action) => {
    if (!action || !action.type) return;

    // console.log('[Action Executor]', action);

    switch (action.type) {
      case 'highlight':
        // Flash/highlight target component
        const target = document.querySelector(`[data-ai-target="${action.target}"]`);
        if (target) {
          target.classList.add('ai-highlight-pulse');
          setTimeout(() => target.classList.remove('ai-highlight-pulse'), 3000);
        }
        break;

      case 'navigate':
        // Suggest navigation (log for now, could auto-navigate)
        // console.log('[Action] Navigate to:', action.target);
        // window.location.href = action.target; // Uncomment to enable auto-navigation
        break;

      case 'show_hint':
        // Show tooltip/hint (implementation depends on UI framework)
        if (action.payload?.autoOpen) {
          setIsOpen(true);
        }
        if (action.payload?.bounce) {
          // Bounce the AI button
          const button = document.querySelector('.ai-chat-trigger');
          if (button) {
            button.classList.add('ai-bounce');
            setTimeout(() => button.classList.remove('ai-bounce'), 1000);
          }
        }
        break;

      default:
        // console.log('[Action] Unknown type:', action.type);
    }
  };

  // Generate consistent gradient for staff avatar (matching StaffList)
  const getStaffGradient = (staffId) => {
    const gradients = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
    ];
    const index = staffId ? staffId % gradients.length : 0;
    return gradients[index];
  };

  const profile = staffProfile || user;
  const userInitials = profile?.first_name?.charAt(0) || '' + (profile?.last_name?.charAt(0) || '');
  const userGradient = getStaffGradient(profile?.staff_id || profile?.id);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detect scroll position to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // More precise detection - only hide when truly at bottom (within 50px)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 50;
    
    setShowScrollButton(!isAtBottom && messages.length > 3); // Only show if scrolled up AND have messages
  }, [messages.length]); // Re-create when messages.length changes

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add scroll listener to messages container
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen, handleScroll]); // handleScroll is stable via useCallback

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Initialize with welcome message only for new sessions
  useEffect(() => {
    if (isOpen && messages.length === 0 && !sessionId) {
      const welcomeMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `Hello ${user?.first_name || 'there'}! I'm your NextGen AI Assistant. I can help you with:

- Understanding the NextGen system
- Operational workflows and procedures
- Your role and responsibilities
- System features and navigation

What would you like to know?`,
        timestamp: new Date(),
        contextSources: 0,
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, sessionId, user]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Track message send event
    trackClick('ai_chat_send', { 
      messageLength: inputValue.length,
      queryPreview: inputValue.substring(0, 50)
    });

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Detect current page from window location
      const currentPage = window.location.pathname.split('/').pop() || 'Dashboard';
      
      // Call Supabase Edge Function (which handles Pinecone + OpenAI server-side)
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          query: inputValue,
          staffId: user?.staff_id || user?.id,
          accessLevel: user?.access_level || 1,
          currentPage: currentPage.replace('-', ' ').replace(/([A-Z])/g, ' $1').trim(),
          conversationHistory: messages.slice(-4).map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      });

      if (error) throw error;

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        tokensUsed: data.tokensUsed,
        contextSources: data.contextSources?.pinecone || 0,
        responseTime: data.responseTime,
        action: data.action, // NEW: Store action if provided
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute action if AI suggested one (Todo 7)
      if (data.action) {
        // console.log('[AI Action]', data.action);
        executeAction(data.action);
      }
    } catch (error) {
      // console.error('Error getting AI response:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    setIsMinimized(false);
    
    // Track chat open/close
    if (newState) {
      trackClick('ai_chat_open');
    } else {
      trackClick('ai_chat_close');
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeAndResetChat = () => {
    // Clear all session data (keep session valid flag for this login)
    setMessages([]);
    setSessionId(null);
    setInputValue('');
    localStorage.removeItem(STORAGE_KEY);
    setIsOpen(false);
    setIsMinimized(false);
    // console.log('[AIChatWidget] Chat reset - history cleared');
  };

  return (
    <>
      {/* Chat Widget Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="ai-chat-trigger"
            aria-label="Open AI Assistant"
          >
            <motion.div
              animate={{ 
                y: [0, -4, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
            
            {/* Ping animation */}
            <span className="ai-chat-ping" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="ai-chat-window"
            data-minimized={isMinimized}
          >
            {/* Header */}
            <div className="ai-chat-header">
              <div className="flex items-center gap-3">
                <div className="ai-chat-avatar">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="ai-chat-title">NextGen AI Assistant</h3>
                  <p className="ai-chat-subtitle">Powered by AWS Bedrock</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMinimize}
                  className="ai-chat-control-btn"
                  aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={closeAndResetChat}
                  className="ai-chat-control-btn"
                  aria-label="Close and reset chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <div className="ai-chat-messages" ref={messagesContainerRef} style={{ position: 'relative' }}>
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} userProfile={profile} />
                  ))}
                  
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ai-chat-message assistant"
                    >
                      <div className="ai-chat-message-avatar">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="ai-chat-message-content ai-thinking-content">
                        <p className="ai-chat-message-text ai-thinking-text">
                          <span className="ai-thinking-dots">
                            <span className="ai-thinking-dot"></span>
                            <span className="ai-thinking-dot"></span>
                            <span className="ai-thinking-dot"></span>
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Scroll to Bottom Button - Absolute Overlay */}
                <AnimatePresence>
                  {showScrollButton && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={scrollToBottom}
                      className="ai-scroll-to-bottom"
                      aria-label="Scroll to bottom"
                    >
                      <span className="ai-scroll-to-bottom-text">New messages</span>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Input Area */}
                <div className="ai-chat-input-container">
                  <div className="ai-chat-input-wrapper">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about NextGen..."
                      className="ai-chat-input"
                      rows={1}
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="ai-chat-send-btn"
                      aria-label="Send message"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  <p className="ai-chat-disclaimer">
                    AI responses may not always be accurate. Please verify important information.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
