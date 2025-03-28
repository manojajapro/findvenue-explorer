
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, venueId, type } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://esdmelfzeszjtbnoajig.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Fetch venue data
    let venueData = null;
    let allVenueData = null;
    
    if (venueId) {
      // Fetch specific venue data if venueId is provided
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();
        
      if (error) throw error;
      venueData = data;
    } else {
      // Fetch all venues for general queries
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .limit(50);
        
      if (error) throw error;
      allVenueData = data;
    }
    
    // Prepare system prompt
    let systemPrompt = "You are a knowledgeable venue assistant that provides accurate information about venues based on the available data. ";
    
    if (venueData) {
      // For specific venue queries
      systemPrompt += `You have detailed information about ${venueData.name}:\n`;
      systemPrompt += `Description: ${venueData.description || 'No description available'}\n`;
      systemPrompt += `Location: ${venueData.address || 'Unknown'}, ${venueData.city_name || 'Unknown'}\n`;
      systemPrompt += `Category: ${venueData.category_name || 'Unknown'}\n`;
      systemPrompt += `Capacity: ${venueData.min_capacity || 0} to ${venueData.max_capacity || 0} guests\n`;
      systemPrompt += `Price: Starting from ${venueData.currency || 'SAR'} ${venueData.starting_price || 0}\n`;
      systemPrompt += `Amenities: ${venueData.amenities?.join(', ') || 'None listed'}\n`;
      systemPrompt += `WiFi: ${venueData.wifi ? 'Available' : 'Not available'}\n`;
      systemPrompt += `Parking: ${venueData.parking ? 'Available' : 'Not available'}\n`;
    } else if (allVenueData) {
      // For general venue queries
      systemPrompt += "You have information about multiple venues. Please provide concise answers based on the venue database. ";
      systemPrompt += "If asked about specific details of a venue that isn't explicitly mentioned in your data, suggest that the user view that specific venue page for more information.";
    }
    
    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const answer = data.choices[0].message.content;
    
    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in venue-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
