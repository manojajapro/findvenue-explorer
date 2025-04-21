
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // Supabase client (anon for public function)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all venues
    const { data: venues, error } = await supabase.from('venues').select('*');
    if (error) {
      throw error;
    }

    // Search: Lowercase prompt, and check if any field (string, number, array, jsonb) contains keyword
    const keywords = prompt.toLowerCase().split(/\s+/).filter(Boolean);

    const filterVenues = (venue) => {
      // Flatten venue object for search
      const row = Object.entries(venue)
        .map(([k, v]) =>
          Array.isArray(v)
            ? v.join(' ')
            : typeof v === 'object' && v !== null
            ? JSON.stringify(v)
            : String(v ?? '')
        )
        .join(' ')
        .toLowerCase();
      return keywords.every((kw) => row.includes(kw));
    };

    const matchedVenues = venues.filter(filterVenues);

    // Format matched venue rows for context
    const venueInfoStrings = matchedVenues.slice(0, 5).map((venue) => {
      // Show all major fields (as string)
      return Object.entries(venue)
        .map(([k, v]) =>
          `${k}: ${
            Array.isArray(v)
              ? v.join(', ')
              : typeof v === 'object' && v !== null
              ? JSON.stringify(v)
              : v
          }`
        )
        .join('\n');
    });

    const contextString = venueInfoStrings.join("\n\n");

    // Compose final system prompt for AI
    const systemPrompt = `You are the FindVenue Pro Assistant. Answer the user using ONLY the data in the provided venues. 
Format your answer with pro-level clarity, and if relevant to the question, show matching venue details or features.
Venue attribute context:

${contextString || "No venues matched."}
`;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error("Missing OpenAI API Key");

    // GPT-4o-mini for best creative/comprehension
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 512
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error((await openAIResponse.json()).error?.message || "OpenAI API error");
    }

    const completion = await openAIResponse.json();
    const answer = completion.choices?.[0]?.message?.content ?? "I could not find any venues matching your query.";

    return new Response(
      JSON.stringify({
        answer,
        venues: matchedVenues.slice(0, 5)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error('SmartVenueAssistant error:', e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
