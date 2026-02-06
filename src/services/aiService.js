/**
 * NextGen AI Service - OpenAI Integration
 * Handles AI chat completions with GPT-4o-mini for RAG chatbot
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

/**
 * System prompt for NextGen AI Assistant
 * Role-based access control context is injected dynamically
 */
const getSystemPrompt = (staffInfo, accessLevel) => {
  const roleMap = {
    1: 'Volunteer',
    3: 'Team Leader',
    5: 'Coordinator',
    10: 'Administrator',
  };
  
  const role = roleMap[accessLevel] || 'Staff Member';
  
  return `You are the NextGen AI Assistant, a helpful companion for Christ's Commission Fellowship (CCF) NextGen Children's Ministry.

**Your Role:**
- Help staff members understand and use the NextGen Management System
- Answer questions about operational workflows, procedures, and best practices
- Provide personalized assistance based on the user's role and access level
- Be warm, professional, and encouraging

**Current User Context:**
- Name: ${staffInfo.firstName} ${staffInfo.lastName}
- Role: ${role} (Access Level ${accessLevel})
- Email: ${staffInfo.email}

**Access Level Capabilities:**
${getAccessLevelDescription(accessLevel)}

**Guidelines:**
1. Always be respectful and supportive of children's ministry volunteers
2. Provide clear, actionable guidance based on the NextGen User Manual
3. When referencing system features, be specific about where to find them
4. If the user asks about data they don't have access to, politely explain the access restrictions
5. For operational questions, provide step-by-step instructions when helpful
6. Use a warm, encouraging tone that reflects the ministry's mission
7. If you're unsure about something, be honest and suggest who they should contact
8. Never make up information - only use facts from your knowledge base

**Important Constraints:**
- Respect role-based access control - don't provide information beyond the user's access level
- Don't share sensitive information about children or families unless the user has proper access
- Focus on helping with system usage, not theological or ministry strategy questions
- Keep responses concise but thorough

Remember: You're here to make their volunteer experience smoother and more effective!`;
};

/**
 * Get access level description for context
 */
const getAccessLevelDescription = (accessLevel) => {
  switch (accessLevel) {
    case 1: // Volunteer
      return `As a Volunteer, you can:
- View the Dashboard with ministry overview
- View your Staff Assignments
- Check in/out children (when assigned)
- Limited access to reports and management features`;
    
    case 3: // Team Leader
      return `As a Team Leader, you can:
- Full Dashboard access
- View and manage Staff Assignments
- Manage Children records (add, edit, view)
- Track Attendance
- Manage Guardians
- Limited reporting access`;
    
    case 5: // Coordinator
      return `As a Coordinator, you have:
- All Team Leader permissions
- Full Reports access
- Analytics and insights
- Email management capabilities
- Advanced ministry oversight features`;
    
    case 10: // Administrator
      return `As an Administrator, you have:
- Full system access
- Staff Management (add, edit, remove staff)
- System Settings configuration
- Email API settings
- Complete reporting and analytics
- All ministry data access`;
    
    default:
      return 'Limited system access';
  }
};

/**
 * Generate embedding for user query
 */
export const generateQueryEmbedding = async (query) => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 512,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate query embedding');
  }
};

/**
 * Get AI chat completion with RAG context
 */
export const getChatCompletion = async ({
  messages,
  staffInfo,
  accessLevel,
  ragContext = [],
  supabaseContext = null,
}) => {
  try {
    const systemPrompt = getSystemPrompt(staffInfo, accessLevel);
    
    // Build context from RAG sources
    let contextMessage = '';
    if (ragContext.length > 0) {
      contextMessage = '\n\n**Relevant Information from NextGen User Manual:**\n';
      ragContext.forEach((doc, idx) => {
        contextMessage += `\n[Source ${idx + 1}]:\n${doc.text}\n`;
      });
    }
    
    // Add Supabase context if available
    if (supabaseContext) {
      contextMessage += '\n\n**Current System Data:**\n';
      contextMessage += JSON.stringify(supabaseContext, null, 2);
    }
    
    // Prepare messages array
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];
    
    // Add context to the last user message if available
    if (contextMessage && apiMessages[apiMessages.length - 1]?.role === 'user') {
      apiMessages[apiMessages.length - 1].content += contextMessage;
    }
    
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      content: response.choices[0].message.content,
      tokensUsed: response.usage.total_tokens,
      responseTime,
      model: response.model,
    };
  } catch (error) {
    console.error('Error getting chat completion:', error);
    throw new Error('Failed to get AI response');
  }
};

/**
 * Stream AI chat completion (for real-time responses)
 */
export const streamChatCompletion = async ({
  messages,
  staffInfo,
  accessLevel,
  ragContext = [],
  supabaseContext = null,
  onChunk,
}) => {
  try {
    const systemPrompt = getSystemPrompt(staffInfo, accessLevel);
    
    // Build context
    let contextMessage = '';
    if (ragContext.length > 0) {
      contextMessage = '\n\n**Relevant Information from NextGen User Manual:**\n';
      ragContext.forEach((doc, idx) => {
        contextMessage += `\n[Source ${idx + 1}]:\n${doc.text}\n`;
      });
    }
    
    if (supabaseContext) {
      contextMessage += '\n\n**Current System Data:**\n';
      contextMessage += JSON.stringify(supabaseContext, null, 2);
    }
    
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];
    
    if (contextMessage && apiMessages[apiMessages.length - 1]?.role === 'user') {
      apiMessages[apiMessages.length - 1].content += contextMessage;
    }
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });
    
    let fullContent = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }
    
    return {
      content: fullContent,
      success: true,
    };
  } catch (error) {
    console.error('Error streaming chat completion:', error);
    throw new Error('Failed to stream AI response');
  }
};

export default {
  generateQueryEmbedding,
  getChatCompletion,
  streamChatCompletion,
};
