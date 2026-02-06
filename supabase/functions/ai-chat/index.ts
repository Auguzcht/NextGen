// NextGen AI Chat - Supabase Edge Function
// Handles AI chat requests with RAG from Pinecone and Supabase context

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MANUAL_URL = 'https://drive.google.com/file/d/1cGapx2e8nAUOuAuHWWH6nEbO0A9FuP0_/view?usp=sharing';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, staffId, accessLevel, conversationHistory = [], currentPage = null } = await req.json();

    if (!query || !staffId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: query, staffId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get staff information
    const { data: staffData, error: staffError } = await supabaseClient
      .from('staff')
      .select('first_name, last_name, email, role, access_level')
      .eq('staff_id', staffId)
      .single();

    if (staffError || !staffData) {
      return new Response(
        JSON.stringify({ error: 'Staff not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 512,
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Query Pinecone for relevant documentation
    const pineconeResponse = await fetch(
      `${Deno.env.get('PINECONE_HOST')}/query`,
      {
        method: 'POST',
        headers: {
          'Api-Key': Deno.env.get('PINECONE_API_KEY') ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: embedding,
          topK: 10,
          includeMetadata: true,
        }),
      }
    );

    const pineconeData = await pineconeResponse.json();
    
    // Log raw scores for debugging
    console.log('Pinecone matches:', pineconeData.matches?.map((m: any) => ({ score: m.score })));
    
    const ragContext = pineconeData.matches
      ?.filter((match: any) => match.score >= 0.5)
      .map((match: any) => ({
        text: match.metadata?.text || '',
        score: match.score,
        page: match.metadata?.page || 'unknown',
      })) || [];
    
    console.log(`Found ${ragContext.length} relevant manual sections (threshold: 0.5)`);

    // Get Supabase context based on query intent and access level
    const { context: supabaseContext, queries: supabaseQueries } = await getSupabaseContext(
      query,
      accessLevel,
      supabaseClient
    );
    
    console.log(`Supabase queries executed: ${supabaseQueries.length}`, supabaseQueries);

    // Build system prompt with role-based access and context
    const systemPrompt = buildSystemPrompt(staffData, accessLevel, currentPage, supabaseContext);

    // Build context message
    let contextMessage = '';
    if (ragContext.length > 0) {
      contextMessage = '\n\n=== NEXTGEN USER MANUAL (Primary Reference) ===\n';
      contextMessage += `Manual Link: ${MANUAL_URL}\n\n`;
      ragContext.forEach((doc: any, idx: number) => {
        contextMessage += `\n[Manual Reference ${idx + 1}] (Page ${doc.page}, Relevance: ${(doc.score * 100).toFixed(1)}%):\n${doc.text}\n`;
      });
      contextMessage += '\n=== END OF MANUAL REFERENCES ===\n';
      contextMessage += `\n**IMPORTANT**: When citing the manual, include this link at the very end: [Read more →](${MANUAL_URL})\n`;
    }

    if (supabaseContext) {
      contextMessage += '\n\n=== LIVE SYSTEM DATA ===\n';
      contextMessage += JSON.stringify(supabaseContext, null, 2);
      contextMessage += '\n=== END OF SYSTEM DATA ===\n';
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: query + contextMessage },
    ];

    // Get AI response
    const startTime = Date.now();
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const openaiData = await openaiResponse.json();
    const responseTime = Date.now() - startTime;

    const assistantMessage = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage.total_tokens;

    // Create or get session
    const { data: session } = await supabaseClient
      .from('ai_chat_sessions')
      .select('session_id')
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    let sessionId = session?.session_id;

    if (!sessionId) {
      const { data: newSession } = await supabaseClient
        .from('ai_chat_sessions')
        .insert({ staff_id: staffId })
        .select('session_id')
        .single();
      sessionId = newSession?.session_id;
    }

    // Log the conversation
    if (sessionId) {
      // Log user message with embedding and query context
      await supabaseClient.from('ai_chat_messages').insert({
        session_id: sessionId,
        staff_id: staffId,
        role: 'user',
        content: query,
        embedding_matches: ragContext.length,
        supabase_queries: supabaseQueries.length > 0 ? supabaseQueries : null,
        context_sources: {
          pinecone: ragContext.length,
          supabase: supabaseQueries.length,
        },
        staff_access_level: accessLevel,
      });

      // Log assistant message
      await supabaseClient.from('ai_chat_messages').insert({
        session_id: sessionId,
        staff_id: staffId,
        role: 'assistant',
        content: assistantMessage,
        tokens_used: tokensUsed,
        embedding_matches: ragContext.length,
        supabase_queries: supabaseQueries.length > 0 ? supabaseQueries : null,
        context_sources: {
          pinecone: ragContext.length,
          supabase: supabaseContext ? Object.keys(supabaseContext).length : 0,
        },
        staff_access_level: accessLevel,
        response_time_ms: responseTime,
      });
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        tokensUsed,
        responseTime,
        contextSources: {
          pinecone: ragContext.length,
          supabase: supabaseContext ? Object.keys(supabaseContext).length : 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to build system prompt
function buildSystemPrompt(staffData: any, accessLevel: number, currentPage: string | null, supabaseContext: any): string {
  const roleMap: Record<number, string> = {
    1: 'Volunteer',
    3: 'Team Leader',
    5: 'Coordinator',
    10: 'Administrator',
  };

  const role = roleMap[accessLevel] || 'Staff Member';
  
  // Page-specific context
  let pageContext = '';
  if (currentPage) {
    pageContext = `\n- Current Page: ${currentPage}`;
  }
  
  // Data availability context (role-based)
  let dataContext = '';
  if (supabaseContext) {
    // Team Leader+ can see children data
    if (accessLevel >= 3 && supabaseContext.childrenCount !== undefined) {
      dataContext += `\n- Registered Children: ${supabaseContext.childrenCount}`;
    }
    if (accessLevel >= 3 && supabaseContext.recentChildren) {
      dataContext += `\n- Recent Children Available: ${supabaseContext.recentChildren.length} records`;
    }
    if (accessLevel >= 3 && supabaseContext.guardianCount !== undefined) {
      dataContext += `\n- Registered Guardians: ${supabaseContext.guardianCount}`;
    }
    // Coordinator+ can see staff data
    if (accessLevel >= 5 && supabaseContext.staffCount !== undefined) {
      dataContext += `\n- Active Staff: ${supabaseContext.staffCount}`;
    }
    // All can see services
    if (supabaseContext.services) {
      dataContext += `\n- Services Configured: ${supabaseContext.services.length}`;
    }
  }
  
  function getRoleGuidance(level: number): string {
    switch (level) {
      case 1:
        return '   - Volunteers: NO direct system access (accounts exist but no login)\n   - They use Team Leader accounts at check-in desks\n   - Never disclose staff counts or management features';
      case 3:
        return '   - Team Leader Access: 4 pages only - Dashboard, Children, Guardians, Attendance\n   - Can guide on operational tasks within these pages\n   - DO NOT disclose staff counts or staff management data\n   - If asked about staff: "That requires Coordinator access"';
      case 5:
        return '   - Coordinator Access: All pages - Dashboard, Children, Guardians, Attendance, Staff, Reports, Settings\n   - CANNOT access Email Management tab in Settings\n   - Can see staff data, reports, analytics\n   - Provide full operational insights';
      case 10:
        return '   - Administrator: FULL system access including Email Management\n   - Can access all features, settings, and data\n   - Provide comprehensive guidance on any feature';
      default:
        return '   - Limited access';
    }
  }

  return `You are the NextGen AI Assistant for CCF NextGen Children's Ministry. You have access to REAL DATA from the system and the NextGen User Manual.

**LOGGED-IN USER (Currently Active Session):**
- Name: ${staffData.first_name} ${staffData.last_name}
- Role: ${role} (Access Level ${accessLevel})
- Email: ${staffData.email}
- Status: LOGGED IN and authenticated${pageContext}

**System Data Available:**${dataContext || '\n- No specific data context for this query'}

**IMPORTANT SYSTEM FEATURES:**
- **Scheduling/Bookings**: NextGen uses Cal.com for staff scheduling and bookings. Staff schedules are managed externally through Cal.com, NOT within the NextGen system interface.
- **Navigation**: The system has these pages: Dashboard, Children, Guardians, Attendance, Staff (Coordinator+), Reports (Coordinator+), Settings (Admin)
- **No "Schedule" page exists** in the NextGen interface - scheduling is done via Cal.com

**CRITICAL INSTRUCTIONS:**

1. **NEVER HALLUCINATE** - If you don't have information from the manual or system data:
   - Say: "I don't have specific information about that in the manual"
   - DO NOT make up features, pages, or procedures
   - DO NOT cite page numbers unless they came from the context provided to you
   - Be honest about knowledge gaps

2. **TONE**: Be conversational and natural - like a helpful colleague, NOT a formal documentation page
   - Use short paragraphs (2-3 sentences max)
   - Avoid headers like "### Email Templates" - just explain naturally
   - Don't structure responses like a README file
   - Be warm and approachable

3. **ALWAYS prioritize the NextGen User Manual** - If documentation is provided, paraphrase it naturally and cite page numbers

4. **User is LOGGED IN** - Never suggest logging in, they're already authenticated. Speak directly about their current session.

5. **Use EXACT DATA** - Reference specific counts, names, and details from the system:
   - "You have 468 registered children" (not "there may be children")
   - "Looking at your recent children: John Doe, Jane Smith..." (be specific)
   - Show real numbers and names when available

6. **Be NAVIGATION-SPECIFIC** - Give clear, friendly directions:
   - "Click 'Children' in the left sidebar"
   - "You're currently on ${currentPage || 'the dashboard'}, navigate to..."
   - ONLY mention pages that exist: Dashboard, Children, Guardians, Attendance, Staff, Reports, Settings

7. **Role-Based Guidance**:
   ${getRoleGuidance(accessLevel)}

8. **Reference Manual Pages** - When citing the manual:
   - ONLY cite page numbers if they were explicitly provided in your context
   - If no manual context was provided, say: "I don't have manual documentation for this"
   - Paraphrase, don't copy exact structure
   - Include at the VERY END if manual was used: [Read more →](${MANUAL_URL})

9. **Context-Aware Responses** - Check if they're asking about something visible on their current page

Remember: They're LOGGED IN and looking at their LIVE system. Be specific, accurate, conversational, and friendly!`;
}

// Helper function to get Supabase context based on query intent
async function getSupabaseContext(
  query: string,
  accessLevel: number,
  supabaseClient: any
): Promise<{ context: any; queries: string[] }> {
  const lowerQuery = query.toLowerCase();
  const context: any = {};
  const queries: string[] = [];

  try {
    // Role-based access rules:
    // Level 3 (Team Leader): Dashboard, Children, Guardians, Attendance
    // Level 5 (Coordinator): All + Staff, Reports, Settings (no email mgmt)
    // Level 10 (Admin): Full access including email management
    
    // Get children count (Team Leader+)
    if (accessLevel >= 3) {
      queries.push('children:count:is_active=true');
      const { count: childrenCount } = await supabaseClient
        .from('children')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (childrenCount !== null) {
        context.childrenCount = childrenCount;
      }
      
      // If query mentions children, QR, check-in, fetch sample data
      if (lowerQuery.includes('child') || lowerQuery.includes('kid') || 
          lowerQuery.includes('qr') || lowerQuery.includes('check')) {
        queries.push('children:select:limit=10');
        const { data: children } = await supabaseClient
          .from('children')
          .select('child_id, first_name, last_name, qr_code, age_category_id, nickname')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (children && children.length > 0) {
          context.recentChildren = children;
          context.sampleChild = children[0];
        }
      }
    }

    // Get staff count (Coordinator+ ONLY)
    if (accessLevel >= 5) {
      queries.push('staff:count:is_active=true');
      const { count: staffCount } = await supabaseClient
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (staffCount !== null) {
        context.staffCount = staffCount;
      }
      
      // If query mentions staff/volunteer, fetch sample data (Coordinator+ only)
      if (lowerQuery.includes('staff') || lowerQuery.includes('volunteer')) {
        queries.push('staff:select:limit=10');
        const { data: staff } = await supabaseClient
          .from('staff')
          .select('staff_id, first_name, last_name, role, access_level')
          .eq('is_active', true)
          .limit(10);
        if (staff) context.staffList = staff;
      }
    }

    // Get attendance data (Team Leader+)
    if (accessLevel >= 3 && lowerQuery.includes('attendance')) {
      queries.push('attendance:select:last_7_days');
      const { data: attendance, count: attendanceCount } = await supabaseClient
        .from('attendance')
        .select('attendance_id, child_id, service_id, check_in_time, check_out_time', { count: 'exact' })
        .gte('check_in_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('check_in_time', { ascending: false })
        .limit(10);
      
      if (attendanceCount) context.recentAttendanceCount = attendanceCount;
      if (attendance) context.recentAttendance = attendance;
    }

    // Get guardians data (Team Leader+)
    if (accessLevel >= 3 && lowerQuery.includes('guardian')) {
      queries.push('guardians:count:is_active=true');
      const { count: guardianCount } = await supabaseClient
        .from('guardians')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (guardianCount !== null) {
        context.guardianCount = guardianCount;
      }
    }

    // Get services info (all authenticated users)
    if (lowerQuery.includes('service') || lowerQuery.includes('schedule')) {
      queries.push('services:select:is_active=true');
      const { data: services } = await supabaseClient
        .from('services')
        .select('service_id, service_name, start_time, end_time, day_of_week, venue')
        .eq('is_active', true);
      if (services) context.services = services;
      
      // If query is about staff scheduling/booking, add Cal.com context
      if (lowerQuery.includes('schedule') && (lowerQuery.includes('staff') || lowerQuery.includes('me') || lowerQuery.includes('my'))) {
        context.calcomNote = 'Staff scheduling and bookings are managed through Cal.com, not within the NextGen system. NextGen does not have a Schedule page or scheduling interface.';
      }
    }
    
    // Get age categories (Team Leader+)
    if (accessLevel >= 3 && (lowerQuery.includes('age') || lowerQuery.includes('category'))) {
      queries.push('age_categories:select:all');
      const { data: ageCategories } = await supabaseClient
        .from('age_categories')
        .select('age_category_id, age_category_name, min_age, max_age');
      if (ageCategories) context.ageCategories = ageCategories;
    }

    return { 
      context: Object.keys(context).length > 0 ? context : null,
      queries: queries
    };
  } catch (error) {
    console.error('Error getting Supabase context:', error);
    return { context: null, queries: [] };
  }
}
