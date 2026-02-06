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

    // COMPUTE DERIVED STATE FIRST (need for intent-based filtering)
    let sessionState: any = null;
    try {
      // Get or create session first
      const { data: existingSession } = await supabaseClient
        .from('ai_chat_sessions')
        .select('session_id')
        .eq('staff_id', staffId)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      let sessionId = existingSession?.session_id;

      if (!sessionId) {
        const { data: newSession } = await supabaseClient
          .from('ai_chat_sessions')
          .insert({ staff_id: staffId })
          .select('session_id')
          .single();
        sessionId = newSession?.session_id;
      }

      // Compute session state from events using SQL function
      if (sessionId) {
        const { data: stateData, error: stateError } = await supabaseClient
          .rpc('compute_session_state', {
            p_session_id: sessionId,
            p_staff_id: staffId
          });

        if (!stateError && stateData) {
          sessionState = stateData;
          console.log('Computed session state:', {
            intent: sessionState.inferredIntent,
            stuckScore: sessionState.stuckScore,
            timeOnPage: sessionState.timeOnPageSeconds,
            errorCount: sessionState.recentErrors?.length || 0
          });
        } else {
          console.warn('Failed to compute session state:', stateError);
        }
      }
    } catch (error) {
      console.error('Error computing session state:', error);
      // Continue without state - graceful degradation
    }

    // INTENT-AWARE RETRIEVAL (Workaround: No metadata needed)
    // Strategy: Query rewriting + retrieval gating
    
    const inferredIntent = sessionState?.inferredIntent;
    
    // RETRIEVAL GATING: Skip manual ONLY for stuck states (when we have state context)
    const skipManual = inferredIntent?.startsWith('stuck.no_interaction') && 
                       sessionState?.stuckScore > 0.5;
    
    let ragContext: any[] = [];
    
    if (!skipManual) {
      console.log(`[Intent-Aware] Retrieving manual for intent: ${inferredIntent}`);
      
      // QUERY REWRITING: Generate 2-3 variations for better recall
      const queryVariations = generateQueryVariations(query, inferredIntent, currentPage);
      console.log('Query variations:', queryVariations);
      
      // Search with all variations and merge results
      const allMatches: any[] = [];
      
      for (const queryText of queryVariations) {
        // Generate embedding for variation
        const varEmbedding = queryText === query ? embedding : 
          (await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: queryText,
              dimensions: 512,
            }),
          }).then(r => r.json()).then(d => d.data[0].embedding));
        
        // Query Pinecone
        const response = await fetch(
          `${Deno.env.get('PINECONE_HOST')}/query`,
          {
            method: 'POST',
            headers: {
              'Api-Key': Deno.env.get('PINECONE_API_KEY') ?? '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              vector: varEmbedding,
              topK: 8,
              includeMetadata: true,
            }),
          }
        );
        
        const data = await response.json();
        if (data.matches) allMatches.push(...data.matches);
      }
      
      // Deduplicate by chunk ID and take top results
      const seen = new Set();
      const uniqueMatches = allMatches
        .filter((m: any) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        })
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 6);
      
      console.log('Unique matches after deduplication:', uniqueMatches.map((m: any) => ({ 
        id: m.id,
        score: m.score.toFixed(3)
      })));
      
      // Dynamic threshold: maxScore - 0.08
      const maxScore = Math.max(...uniqueMatches.map((m: any) => m.score), 0);
      const threshold = Math.max(0.35, maxScore - 0.08);
      
      ragContext = uniqueMatches
        .filter((match: any) => match.score >= threshold)
        .map((match: any) => ({
          text: match.metadata?.text || '',
          score: match.score,
          page: match.metadata?.chunkIndex || match.metadata?.page || 'unknown',
        }));
      
      console.log(`Found ${ragContext.length} relevant manual sections (threshold: ${threshold.toFixed(2)}, from ${uniqueMatches.length} candidates)`);
    } else {
      console.log(`[Intent-Aware] Skipping manual retrieval for intent: ${inferredIntent}`);
    }

    // Get Supabase context based on query intent and access level
    const { context: supabaseContext, queries: supabaseQueries } = await getSupabaseContext(
      query,
      accessLevel,
      supabaseClient
    );
    
    console.log(`Supabase queries executed: ${supabaseQueries.length}`, supabaseQueries);

    // BUILD STRUCTURED CONTEXT (Gold-Standard Architecture)
    // Separate concerns: Identity, User, State, Manual, Data
    
    const baseIdentity = buildBaseIdentity();
    const userContext = buildUserContext(staffData, accessLevel, currentPage);
    const stateContext = buildStateContext(sessionState);
    const manualContext = buildManualContext(ragContext);
    const dataContext = buildDataContext(supabaseContext, accessLevel);

    // Prepare messages with STRUCTURED JSON (not prose bloat)
    const messages = [
      { role: 'system', content: baseIdentity }, // Core identity (10 lines)
      { role: 'system', content: `USER:\n${JSON.stringify(userContext, null, 2)}` },
      { role: 'system', content: `STATE:\n${JSON.stringify(stateContext, null, 2)}` },
      { role: 'system', content: `MANUAL_CONTEXT:\n${JSON.stringify(manualContext, null, 2)}` },
      { role: 'system', content: `DATA:\n${JSON.stringify(dataContext, null, 2)}` },
      ...conversationHistory,
      { role: 'user', content: query },
    ];

    // Get AI response with ACTION SCHEMA support
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
        max_tokens: 1500,
        response_format: { type: 'json_object' }, // Request structured JSON response
      }),
    });

    const openaiData = await openaiResponse.json();
    const responseTime = Date.now() - startTime;

    // Parse JSON response with action schema
    let assistantMessage: string;
    let suggestedAction: any = null;
    
    try {
      const jsonResponse = JSON.parse(openaiData.choices[0].message.content);
      assistantMessage = jsonResponse.message || jsonResponse.response || openaiData.choices[0].message.content;
      suggestedAction = jsonResponse.action || null;
      
      if (suggestedAction) {
        console.log('AI suggested action:', suggestedAction);
      }
    } catch (parseError) {
      // Fallback to plain text if JSON parsing fails
      console.warn('Failed to parse JSON response, using plain text');
      assistantMessage = openaiData.choices[0].message.content;
    }
    
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
      // Log user message with embedding, query context, and STATE SNAPSHOT
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
        session_state_snapshot: sessionState, // NEW: Save state at time of query
      });

      // Log assistant message with ACTION
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
        session_state_snapshot: sessionState,
        action_suggested: suggestedAction, // NEW: Save action if suggested
      });
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        tokensUsed,
        responseTime,
        action: suggestedAction, // NEW: Include action in response
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

// ============================================================================
// STRUCTURED CONTEXT BUILDERS (Gold-Standard Architecture)
// Separate Identity, User, State, Manual, Data into clean JSON
// ============================================================================

function buildBaseIdentity(): string {
  return `You are NextGen AI, a proactive assistant for CCF Children's Ministry.

**RESPONSE FORMAT:**
Always respond with JSON:
{
  "message": "Your conversational response here",
  "action": {
    "type": "highlight" | "navigate" | "show_hint" | null,
    "target": "component_name",
    "payload": {}
  }
}

**CORE RULES:**
1. NEVER HALLUCINATE - If you don't know, say "I don't have that information"
2. Use STATE to detect if user is stuck (stuckScore > 0.7) - offer proactive help
3. Use MANUAL_CONTEXT pages when answering - ONLY cite pages explicitly provided
4. Use DATA for specific counts and names - be precise
5. Suggest actions when helpful (highlight buttons, navigate to pages)
6. Be WARM, FRIENDLY, and HELPFUL:
   - Start with acknowledgment: "I can help you with that!"
   - Use encouraging language: "Great question!", "You're on the right track!"
   - End with friendly outro: "Let me know if you need anything else!" or "Feel free to ask if you have questions!"
   - Show empathy: "I understand that can be tricky" or "That's a common question"
7. Response STRUCTURE:
   - Opening: Acknowledge their question warmly
   - Body: Provide clear, numbered steps OR direct answer
   - Closing: Friendly outro offering continued help
8. FORMATTING:
   - Use ### for section headers
   - ALWAYS prefix steps with numbers: "1. Step name", "2. Next step", "3. Final step"
   - Put continuation details on next line (no number prefix for details)
   - Use bullet points (-) ONLY for feature lists or options (NOT for steps)
   - Keep paragraphs short (2-3 sentences max)
   - Include specific navigation: "Click 'X' in the sidebar → Select 'Y'"
   - Add blank lines between sections for readability

**FORMATTING EXAMPLES:**

Example 1 - Step-by-step answer:
I can help you with that! Here's how to check in a child:

### Steps to Check In a Child

1. Navigate to the Guardians Page
Click 'Guardians' in the sidebar navigation.

2. Select the Guardian to Associate
From the guardians list, locate the guardian you want to link.

3. Confirm Association
Review the details and click 'Save'.

Let me know if you need any clarification on these steps! I'm here to help.

Example 2 - Direct answer:
Great question! The Children page displays all registered children in the system. You can search by name, filter by age category, and view detailed information for each child.

Feel free to ask if you'd like to know more about any specific features!

Incorrect (DO NOT DO THIS - too abrupt, no warmth):
Navigate to the Guardians Page
Click 'Guardians' in the sidebar.
Select the Guardian
Locate the guardian you want.

**ACTION TYPES:**
- "highlight": Flash/highlight a specific component (e.g., "qr_button", "check_in_form")
- "navigate": Suggest navigating to a page (e.g., "/children", "/attendance")
- "show_hint": Show a tooltip/hint near a component
- null: No action needed (just conversational response)

**SYSTEM INFO:**
- Cal.com handles staff scheduling (NOT in NextGen)
- Pages: Dashboard, Children, Guardians, Attendance, Staff, Reports, Settings
- No "Schedule" page exists

Include manual link at end if manual was used: [Read more →](${MANUAL_URL})`;
}

function buildUserContext(staffData: any, accessLevel: number, currentPage: string | null): any {
  const roleMap: Record<number, string> = {
    1: 'Volunteer',
    3: 'Team Leader',
    5: 'Coordinator',
    10: 'Administrator',
  };

  const accessRules: Record<number, string[]> = {
    1: ['Dashboard (view only)', 'Uses Team Leader accounts for check-in'],
    3: ['Dashboard', 'Children', 'Guardians', 'Attendance'],
    5: ['All pages', 'Staff Management', 'Reports', 'Analytics', 'NO Email Management'],
    10: ['Full access', 'Email Management', 'All settings'],
  };

  return {
    name: `${staffData.first_name} ${staffData.last_name}`,
    email: staffData.email,
    role: roleMap[accessLevel] || 'Staff Member',
    accessLevel: accessLevel,
    currentPage: currentPage || 'Unknown',
    canAccess: accessRules[accessLevel] || [],
    status: 'LOGGED_IN',
  };
}

function buildStateContext(sessionState: any): any {
  if (!sessionState) {
    return {
      available: false,
      note: 'No session state (first interaction or event tracking not initialized)'
    };
  }

  const stuckScore = sessionState.stuckScore || 0;
  const intent = sessionState.inferredIntent || 'general.browsing';
  
  return {
    currentPage: sessionState.currentPage || 'Unknown',
    lastAction: sessionState.lastAction || null,
    inferredIntent: intent,
    timeOnPageSeconds: sessionState.timeOnPageSeconds || 0,
    stuckScore: parseFloat((stuckScore * 100).toFixed(0)),
    isStuck: stuckScore > 0.7,
    recentErrors: sessionState.recentErrors || [],
    alerts: [
      stuckScore > 0.7 ? '🚨 User appears STUCK - offer clear step-by-step guidance' : null,
      intent.includes('stuck') ? '🚨 User explicitly stuck - provide direct instructions' : null,
      intent === 'attendance.check_in' ? '💡 Intent: Check in child - guide QR process' : null,
      sessionState.recentErrors?.length >= 2 ? '⚠️ Multiple errors - troubleshoot specific issues' : null,
    ].filter(Boolean),
  };
}

function buildManualContext(ragContext: any[]): any {
  if (!ragContext || ragContext.length === 0) {
    return {
      available: false,
      note: 'No relevant manual sections found for this query',
    };
  }

  return {
    available: true,
    manualUrl: MANUAL_URL,
    sections: ragContext.map((doc: any, idx: number) => ({
      index: idx + 1,
      page: doc.page,
      relevance: parseFloat((doc.score * 100).toFixed(1)),
      content: doc.text,
    })),
    citationRule: 'ONLY cite page numbers from these sections. If not here, say "I don\'t have manual documentation for this"',
  };
}

function buildDataContext(supabaseContext: any, accessLevel: number): any {
  if (!supabaseContext) {
    return {
      available: false,
      note: 'No system data context for this query',
    };
  }

  const data: any = {
    available: true,
    accessLevel: accessLevel,
  };

  // Team Leader+ data
  if (accessLevel >= 3) {
    if (supabaseContext.childrenCount !== undefined) {
      data.childrenCount = supabaseContext.childrenCount;
    }
    if (supabaseContext.recentChildren) {
      data.recentChildren = supabaseContext.recentChildren;
    }
    if (supabaseContext.guardianCount !== undefined) {
      data.guardianCount = supabaseContext.guardianCount;
    }
    if (supabaseContext.recentAttendanceCount !== undefined) {
      data.recentAttendanceCount = supabaseContext.recentAttendanceCount;
    }
    if (supabaseContext.ageCategories) {
      data.ageCategories = supabaseContext.ageCategories;
    }
  }

  // Coordinator+ data (ONLY)
  if (accessLevel >= 5) {
    if (supabaseContext.staffCount !== undefined) {
      data.staffCount = supabaseContext.staffCount;
    }
    if (supabaseContext.staffList) {
      data.staffList = supabaseContext.staffList;
    }
  }

  // All users
  if (supabaseContext.services) {
    data.services = supabaseContext.services;
  }
  if (supabaseContext.calcomNote) {
    data.calcomNote = supabaseContext.calcomNote;
  }

  return data;
}

// ============================================================================
// QUERY REWRITING (Intent-Workaround Strategy)
// Generates 2-3 query variations to improve recall without metadata
// ============================================================================

function generateQueryVariations(
  query: string,
  intent: string | null,
  currentPage: string | null
): string[] {
  const variations = [query]; // Always include original
  
  // Intent-based rewrites
  if (intent === 'attendance.check_in') {
    variations.push('attendance check in workflow');
    variations.push('qr scan check in steps');
  } else if (intent === 'children.register') {
    variations.push('register new child procedure');
    variations.push('add child formal ID');
  } else if (intent === 'troubleshooting.errors') {
    variations.push('troubleshoot error fix');
    variations.push('common issues solutions');
  } else if (intent?.includes('staff')) {
    variations.push('staff management volunteer assign');
  } else if (intent?.includes('reports')) {
    variations.push('reports analytics dashboard');
  }
  
  // Page-based context boost
  if (currentPage && !query.toLowerCase().includes(currentPage.toLowerCase())) {
    variations.push(`${currentPage.replace('/', '')} ${query}`);
  }
  
  // Return unique variations (max 3)
  return [...new Set(variations)].slice(0, 3);
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
    
    // ALWAYS fetch core counts for context (Team Leader+)
    if (accessLevel >= 3) {
      queries.push('children:count:is_active=true');
      const { count: childrenCount } = await supabaseClient
        .from('children')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (childrenCount !== null) {
        context.childrenCount = childrenCount;
      }
      
      // ALWAYS fetch guardian count for comprehensive context
      queries.push('guardians:count:is_active=true');
      const { count: guardianCount } = await supabaseClient
        .from('guardians')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (guardianCount !== null) {
        context.guardianCount = guardianCount;
      }
      
      // ALWAYS fetch services configured
      queries.push('services:select:is_active=true');
      const { data: services } = await supabaseClient
        .from('services')
        .select('service_id, service_name, start_time, end_time, day_of_week, venue')
        .eq('is_active', true);
      if (services) context.services = services;
      
      // Fetch age categories (useful for children context)
      queries.push('age_categories:select:all');
      const { data: ageCategories } = await supabaseClient
        .from('age_categories')
        .select('age_category_id, age_category_name, min_age, max_age');
      if (ageCategories) context.ageCategories = ageCategories;
      
      // If query mentions children, QR, check-in, fetch sample data
      if (lowerQuery.includes('child') || lowerQuery.includes('kid') || 
          lowerQuery.includes('qr') || lowerQuery.includes('check') || 
          lowerQuery.includes('register') || lowerQuery.includes('add')) {
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

    // ALWAYS get staff count (Coordinator+ ONLY)
    if (accessLevel >= 5) {
      queries.push('staff:count:is_active=true');
      const { count: staffCount } = await supabaseClient
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (staffCount !== null) {
        context.staffCount = staffCount;
      }
      
      // If query mentions staff/volunteer/people/team, fetch sample data
      if (lowerQuery.includes('staff') || lowerQuery.includes('volunteer') || 
          lowerQuery.includes('people') || lowerQuery.includes('team')) {
        queries.push('staff:select:limit=10');
        const { data: staff } = await supabaseClient
          .from('staff')
          .select('staff_id, first_name, last_name, role, access_level')
          .eq('is_active', true)
          .limit(10);
        if (staff) context.staffList = staff;
      }
    }

    // Get recent attendance data (Team Leader+) if relevant
    if (accessLevel >= 3 && (lowerQuery.includes('attendance') || lowerQuery.includes('check'))) {
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
    
    // Add Cal.com note if query is about staff scheduling
    if (lowerQuery.includes('schedule') && (lowerQuery.includes('staff') || lowerQuery.includes('my') || lowerQuery.includes('assign'))) {
      context.calcomNote = 'Staff scheduling and bookings are managed through Cal.com, not within the NextGen system. NextGen does not have a Schedule page or scheduling interface.';
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
