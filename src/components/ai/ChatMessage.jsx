/**
 * NextGen AI Chat Message Component
 * Individual chat message with role-based styling
 */

import { motion } from 'framer-motion';
import { User, Bot, AlertCircle, Sparkles } from 'lucide-react';
import PropTypes from 'prop-types';

const ChatMessage = ({ message, userProfile }) => {
  const { role, content, timestamp, isError, tokensUsed, contextSources } = message;
  
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  
  // Get staff gradient (matching StaffList)
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
  
  const userGradient = getStaffGradient(userProfile?.staff_id || userProfile?.id);
  const userInitials = (userProfile?.first_name?.charAt(0) || '') + (userProfile?.last_name?.charAt(0) || '');
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Parse markdown-like content for AI messages
  const formatContent = (text) => {
    if (!isAssistant) {
      // User messages - simple line breaks
      return text.split('\n').map((line, idx) => (
        <p key={idx} className="ai-chat-message-text">
          {line}
        </p>
      ));
    }

    // AI messages - parse markdown with headers, lists, and formatting
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;
    let currentListItem = null;
    let nestedBullets = []; // Track bullets within numbered items

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines (flush current item but keep list open)
      if (!trimmedLine) {
        // If we have nested bullets, convert them to <ul> and add to list item
        if (nestedBullets.length > 0 && currentListItem) {
          const prevContent = currentListItem.props.children;
          const bulletList = <ul key={`nested-${idx}`}>{nestedBullets}</ul>;
          currentListItem = (
            <li key={currentListItem.key}>
              {prevContent}
              {bulletList}
            </li>
          );
          nestedBullets = [];
        }
        
        // Flush current item but DON'T end the list (allows continuous numbering)
        if (currentListItem) {
          currentList.push(currentListItem);
          currentListItem = null;
        }
        // List continues - will be flushed when we hit a non-list element
        return;
      }
      
      // Headers (###, ##, #)
      if (trimmedLine.startsWith('###')) {
        // Flush nested bullets and list item
        if (nestedBullets.length > 0 && currentListItem) {
          const prevContent = currentListItem.props.children;
          const bulletList = <ul key={`nested-${idx}`}>{nestedBullets}</ul>;
          currentListItem = (
            <li key={currentListItem.key}>
              {prevContent}
              {bulletList}
            </li>
          );
          nestedBullets = [];
        }
        if (currentListItem) {
          currentList.push(currentListItem);
          currentListItem = null;
        }
        if (currentList.length > 0) {
          const ListTag = listType === 'ol' ? 'ol' : 'ul';
          elements.push(<ListTag key={`list-${elements.length}`}>{currentList}</ListTag>);
          currentList = [];
          listType = null;
        }
        const content = trimmedLine.replace(/^###\s*/, '');
        elements.push(
          <h3 key={`h3-${idx}`} className="text-sm font-semibold text-gray-900 mt-2 mb-2">
            {formatInlineMarkdown(content)}
          </h3>
        );
        return;
      }
      
      if (trimmedLine.startsWith('##')) {
        if (nestedBullets.length > 0 && currentListItem) {
          const prevContent = currentListItem.props.children;
          const bulletList = <ul key={`nested-${idx}`}>{nestedBullets}</ul>;
          currentListItem = (
            <li key={currentListItem.key}>
              {prevContent}
              {bulletList}
            </li>
          );
          nestedBullets = [];
        }
        if (currentListItem) {
          currentList.push(currentListItem);
          currentListItem = null;
        }
        if (currentList.length > 0) {
          const ListTag = listType === 'ol' ? 'ol' : 'ul';
          elements.push(<ListTag key={`list-${elements.length}`}>{currentList}</ListTag>);
          currentList = [];
          listType = null;
        }
        const content = trimmedLine.replace(/^##\s*/, '');
        elements.push(
          <h2 key={`h2-${idx}`} className="text-sm font-bold text-gray-900 mt-2 mb-2">
            {formatInlineMarkdown(content)}
          </h2>
        );
        return;
      }

      if (trimmedLine.startsWith('#') && !trimmedLine.startsWith('##')) {
        if (nestedBullets.length > 0 && currentListItem) {
          const prevContent = currentListItem.props.children;
          const bulletList = <ul key={`nested-${idx}`}>{nestedBullets}</ul>;
          currentListItem = (
            <li key={currentListItem.key}>
              {prevContent}
              {bulletList}
            </li>
          );
          nestedBullets = [];
        }
        if (currentListItem) {
          currentList.push(currentListItem);
          currentListItem = null;
        }
        if (currentList.length > 0) {
          const ListTag = listType === 'ol' ? 'ol' : 'ul';
          elements.push(<ListTag key={`list-${elements.length}`}>{currentList}</ListTag>);
          currentList = [];
          listType = null;
        }
        const content = trimmedLine.replace(/^#\s*/, '');
        elements.push(
          <h1 key={`h1-${idx}`} className="text-sm font-bold text-gray-900 mt-2 mb-2">
            {formatInlineMarkdown(content)}
          </h1>
        );
        return;
      }
      
      // Numbered list items (1., 2., 3.)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        // Flush nested bullets from previous item
        if (nestedBullets.length > 0 && currentListItem) {
          const prevContent = currentListItem.props.children;
          const bulletList = <ul key={`nested-${idx}`}>{nestedBullets}</ul>;
          currentListItem = (
            <li key={currentListItem.key}>
              {prevContent}
              {bulletList}
            </li>
          );
          nestedBullets = [];
        }
        
        // Save previous list item if exists
        if (currentListItem) {
          currentList.push(currentListItem);
        }
        
        const content = numberedMatch[2];
        
        // Switch to ol if we were in ul
        if (listType === 'ul' && currentList.length > 0) {
          elements.push(<ul key={`list-${elements.length}`}>{currentList}</ul>);
          currentList = [];
        }
        
        // Start new list item
        currentListItem = (
          <li key={`li-${idx}`}>
            {formatInlineMarkdown(content)}
          </li>
        );
        listType = 'ol';
        return;
      }
      
      // Bullet list items (-, *)
      const bulletMatch = trimmedLine.match(/^[\-\*]\s+(.+)$/);
      if (bulletMatch) {
        const content = bulletMatch[1];
        
        // If we're inside a numbered list item, add as nested bullet
        if (currentListItem && listType === 'ol') {
          nestedBullets.push(
            <li key={`bullet-${idx}`}>
              {formatInlineMarkdown(content)}
            </li>
          );
          return;
        }
        
        // Otherwise, start a new bullet list
        if (currentListItem) {
          currentList.push(currentListItem);
        }
        
        if (listType === 'ol' && currentList.length > 0) {
          elements.push(<ol key={`list-${elements.length}`}>{currentList}</ol>);
          currentList = [];
        }
        
        currentListItem = (
          <li key={`li-${idx}`}>
            {formatInlineMarkdown(content)}
          </li>
        );
        listType = 'ul';
        return;
      }
      
      // Continuation text
      if (currentListItem && (listType === 'ol' || listType === 'ul')) {
        const prevContent = currentListItem.props.children;
        currentListItem = (
          <li key={currentListItem.key}>
            {prevContent}
            <br />
            {formatInlineMarkdown(trimmedLine)}
          </li>
        );
        return;
      }
      
      // Regular paragraph
      if (nestedBullets.length > 0 && currentListItem) {
        const prevContent = currentListItem.props.children;
        const bulletList = <ul key={`nested-${idx}`}>{nestedBullets}</ul>;
        currentListItem = (
          <li key={currentListItem.key}>
            {prevContent}
            {bulletList}
          </li>
        );
        nestedBullets = [];
      }
      
      if (currentListItem) {
        currentList.push(currentListItem);
        currentListItem = null;
      }
      if (currentList.length > 0) {
        const ListTag = listType === 'ol' ? 'ol' : 'ul';
        elements.push(<ListTag key={`list-${elements.length}`}>{currentList}</ListTag>);
        currentList = [];
        listType = null;
      }
      
      elements.push(
        <p key={`p-${idx}`} className="ai-chat-message-text">
          {formatInlineMarkdown(line)}
        </p>
      );
    });

    // Flush remaining nested bullets and list
    if (nestedBullets.length > 0 && currentListItem) {
      const prevContent = currentListItem.props.children;
      const bulletList = <ul key="nested-final">{nestedBullets}</ul>;
      currentListItem = (
        <li key={currentListItem.key}>
          {prevContent}
          {bulletList}
        </li>
      );
    }
    
    if (currentListItem) {
      currentList.push(currentListItem);
    }
    if (currentList.length > 0) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(<ListTag key={`list-final`}>{currentList}</ListTag>);
    }

    return elements;
  };

  // Format inline markdown (bold, italic, code, links)
  const formatInlineMarkdown = (text) => {
    const parts = [];
    let current = '';
    let i = 0;

    while (i < text.length) {
      // Markdown link [text](url)
      if (text[i] === '[') {
        // Try to parse as markdown link
        let linkText = '';
        let linkUrl = '';
        let j = i + 1;
        
        // Extract link text
        while (j < text.length && text[j] !== ']') {
          linkText += text[j];
          j++;
        }
        
        // Check if followed by (url)
        if (j < text.length && text[j] === ']' && text[j + 1] === '(') {
          j += 2; // Skip ](
          while (j < text.length && text[j] !== ')') {
            linkUrl += text[j];
            j++;
          }
          
          if (j < text.length && text[j] === ')' && linkText && linkUrl) {
            // Valid markdown link found
            if (current) parts.push(current);
            current = '';
            parts.push(
              <a 
                key={`link-${i}`} 
                href={linkUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ai-chat-link"
              >
                {linkText}
              </a>
            );
            i = j + 1;
            continue;
          }
        }
      }
      // Bold **text**
      if (text.substring(i, i + 2) === '**') {
        if (current) parts.push(current);
        current = '';
        i += 2;
        let boldText = '';
        while (i < text.length && text.substring(i, i + 2) !== '**') {
          boldText += text[i];
          i++;
        }
        if (boldText) parts.push(<strong key={`bold-${i}`}>{boldText}</strong>);
        i += 2;
      }
      // Italic *text*
      else if (text[i] === '*' && text[i - 1] !== '*' && text[i + 1] !== '*') {
        if (current) parts.push(current);
        current = '';
        i++;
        let italicText = '';
        while (i < text.length && text[i] !== '*') {
          italicText += text[i];
          i++;
        }
        if (italicText) parts.push(<em key={`italic-${i}`}>{italicText}</em>);
        i++;
      }
      // Inline code `text`
      else if (text[i] === '`') {
        if (current) parts.push(current);
        current = '';
        i++;
        let codeText = '';
        while (i < text.length && text[i] !== '`') {
          codeText += text[i];
          i++;
        }
        if (codeText) parts.push(<code key={`code-${i}`}>{codeText}</code>);
        i++;
      }
      else {
        current += text[i];
        i++;
      }
    }

    if (current) parts.push(current);
    return parts.length > 0 ? parts : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`ai-chat-message ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''}`}
    >
      {/* Avatar */}
      <div className="ai-chat-message-avatar">
        {isUser ? (
          userProfile?.profile_image_url ? (
            <img 
              src={userProfile.profile_image_url}
              alt="Your profile"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null
        ) : isError ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
        {isUser && !userProfile?.profile_image_url && (
          <div className={`absolute inset-0 ${userGradient} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            {userInitials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="ai-chat-message-content-wrapper">
        <div className="ai-chat-message-content">
          {formatContent(content)}
        </div>

        {/* Metadata */}
        <div className="ai-chat-message-meta">
          <span className="ai-chat-message-time">{formatTime(timestamp)}</span>
        </div>
      </div>
    </motion.div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.number.isRequired,
    role: PropTypes.oneOf(['user', 'assistant', 'system']).isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.instanceOf(Date).isRequired,
    isError: PropTypes.bool,
    tokensUsed: PropTypes.number,
    contextSources: PropTypes.number,
  }).isRequired,
  userProfile: PropTypes.object,
};

export default ChatMessage;
