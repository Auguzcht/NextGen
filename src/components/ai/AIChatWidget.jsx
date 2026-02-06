/**
 * NextGen AI Chat Widget - Main Component
 * Bottom-right overlay chatbot with NextGen styling
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Send, 
  Loader2, 
  Bot,
  Minimize2,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import supabase from '../../services/supabase.js';
import ChatMessage from './ChatMessage.jsx';
import './AIChatWidget.css';

const AIChatWidget = () => {
  const { user, staffProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Session storage key
  const STORAGE_KEY = `nextgen_ai_chat_${user?.staff_id || user?.id || 'guest'}`;

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setMessages(parsed.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        setSessionId(parsed.sessionId);
      } catch (error) {
        console.error('Failed to parse saved session:', error);
      }
    }
  }, [STORAGE_KEY]);

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
      if (!sessionId) setSessionId(session.sessionId);
    }
  }, [messages, STORAGE_KEY, sessionId]);

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
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
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeAndResetChat = () => {
    // Clear all session data
    setMessages([]);
    setSessionId(null);
    setInputValue('');
    localStorage.removeItem(STORAGE_KEY);
    setIsOpen(false);
    setIsMinimized(false);
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
                  <p className="ai-chat-subtitle">Powered by GPT-4o-mini</p>
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
                <div className="ai-chat-messages">
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
