// NextGen AI Chat Check - Proactive Trigger Endpoint
// Polls user state and returns triggers when proactive help is needed
// Called every 30 seconds by frontend

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { staffId } = await req.json();

    if (!staffId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: staffId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get or create active session
    const { data: session } = await supabaseClient
      .from('ai_chat_sessions')
      .select('session_id, stuck_score, inferred_intent, time_on_page_seconds, recent_errors, current_page, last_action')
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!session) {
      // No active session - no triggers
      return new Response(
        JSON.stringify({ triggers: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute fresh state
    const { data: sessionState, error: stateError } = await supabaseClient
      .rpc('compute_session_state', {
        p_session_id: session.session_id,
        p_staff_id: staffId
      });

    if (stateError || !sessionState) {
      console.warn('Failed to compute session state for proactive check:', stateError);
      return new Response(
        JSON.stringify({ triggers: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze state and determine triggers
    const triggers: any[] = [];

    // TRIGGER 1: Stuck Detection (stuck_score > 0.75)
    if (sessionState.stuckScore > 0.75) {
      const pageName = sessionState.currentPage?.replace('/', '').replace(/-/g, ' ') || 'this page';
      
      // Natural, conversational message based on time spent
      const timeMessage = sessionState.timeOnPageSeconds > 180 
        ? "I see you've been here for a while."
        : "Having trouble finding something?";
      
      triggers.push({
        type: 'stuck_detected',
        priority: 'high',
        message: `${timeMessage} I'm here if you need help navigating or understanding how things work!`,
        context: {
          page: sessionState.currentPage,
          timeOnPage: sessionState.timeOnPageSeconds,
          stuckScore: sessionState.stuckScore,
        },
        action: {
          type: 'show_hint',
          target: 'ai_widget',
          payload: { autoOpen: true }
        }
      });
    }

    // TRIGGER 2: Error Pattern (2+ errors in recent history)
    if (sessionState.recentErrors && sessionState.recentErrors.length >= 2) {
      const errorSummary = sessionState.recentErrors.slice(0, 2).join(', ');
      
      triggers.push({
        type: 'error_pattern',
        priority: 'high',
        message: `I see you're encountering some errors: ${errorSummary.substring(0, 50)}... Can I help troubleshoot?`,
        context: {
          errors: sessionState.recentErrors,
          page: sessionState.currentPage,
        },
        action: {
          type: 'show_hint',
          target: 'ai_widget',
          payload: { autoOpen: true }
        }
      });
    }

    // TRIGGER 3: Idle Timeout (5+ minutes on page with no action)
    if (sessionState.timeOnPageSeconds > 300 && !sessionState.lastAction) {
      triggers.push({
        type: 'idle_timeout',
        priority: 'medium',
        message: `Still working on something? I'm here if you need guidance!`,
        context: {
          page: sessionState.currentPage,
          timeOnPage: sessionState.timeOnPageSeconds,
        },
        action: {
          type: 'show_hint',
          target: 'ai_widget',
          payload: { autoOpen: false, bounce: true }
        }
      });
    }

    // TRIGGER 4: Intent-specific assistance (e.g., check-in attempt)
    if (sessionState.inferredIntent === 'attendance.check_in' && sessionState.timeOnPageSeconds > 30) {
      triggers.push({
        type: 'intent_assistance',
        priority: 'medium',
        message: `I see you're trying to check in a child. Would you like a quick guide on using the QR scanner?`,
        context: {
          intent: sessionState.inferredIntent,
          page: sessionState.currentPage,
          lastAction: sessionState.lastAction,
        },
        action: {
          type: 'show_hint',
          target: 'qr_button',
          payload: { highlight: true }
        }
      });
    }

    // TRIGGER 5: Navigation loop (back/forth multiple times)
    const recentEvents = sessionState.recentEvents || [];
    const backNavCount = recentEvents.filter((e: any) => e.event_type === 'nav_back').length;
    
    if (backNavCount >= 3) {
      triggers.push({
        type: 'navigation_confusion',
        priority: 'medium',
        message: `You seem to be navigating back and forth. Looking for something specific?`,
        context: {
          backNavigations: backNavCount,
        },
        action: {
          type: 'show_hint',
          target: 'ai_widget',
          payload: { autoOpen: false }
        }
      });
    }

    // Return highest priority trigger only (avoid spam)
    const sortedTriggers = triggers.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const triggerToSend = sortedTriggers.length > 0 ? [sortedTriggers[0]] : [];

    // Log proactive trigger if sent
    if (triggerToSend.length > 0) {
      console.log(`[Proactive Trigger] ${triggerToSend[0].type} for staff ${staffId}`);
      
      // Log as proactive message
      await supabaseClient.from('ai_chat_messages').insert({
        session_id: session.session_id,
        staff_id: staffId,
        role: 'proactive',
        content: triggerToSend[0].message,
        was_proactive: true,
        trigger_type: triggerToSend[0].type,
        session_state_snapshot: sessionState,
      });
    }

    return new Response(
      JSON.stringify({ 
        triggers: triggerToSend,
        sessionState: {
          stuckScore: sessionState.stuckScore,
          intent: sessionState.inferredIntent,
          timeOnPage: sessionState.timeOnPageSeconds,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat-check function:', error);
    return new Response(
      JSON.stringify({ error: error.message, triggers: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
