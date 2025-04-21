
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { query_text } = await req.json()
    
    if (!query_text) {
      return new Response(
        JSON.stringify({ error: 'No query provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Received query text:', query_text);
    
    // Using a safer approach for searching venues
    // Instead of executing raw SQL, we're using Supabase's query builder
    let { data, error } = await supabase
      .from('venues')
      .select('*')
      .limit(10)

    // If the query is simple enough we can try to parse some common terms
    const queryLower = query_text.toLowerCase();
    
    // Check for city names in the query
    if (queryLower.includes('city:')) {
      const cityMatch = queryLower.match(/city:\s*([a-z\s]+)(?:,|$)/i);
      if (cityMatch && cityMatch[1]) {
        const cityName = cityMatch[1].trim();
        data = data?.filter(venue => 
          venue.city_name && venue.city_name.toLowerCase().includes(cityName)
        );
      }
    }
    
    // Check for capacity in the query
    if (queryLower.includes('capacity:')) {
      const capacityMatch = queryLower.match(/capacity:\s*(\d+)/i);
      if (capacityMatch && capacityMatch[1]) {
        const minCapacity = parseInt(capacityMatch[1]);
        data = data?.filter(venue => 
          venue.max_capacity >= minCapacity
        );
      }
    }
    
    // Filter by name as a fallback
    if (queryLower.length > 3) {
      // Simple text search on name and description
      data = data?.filter(venue => 
        (venue.name && venue.name.toLowerCase().includes(queryLower)) ||
        (venue.description && venue.description.toLowerCase().includes(queryLower))
      );
    }
    
    if (error) {
      console.error('Error in database query:', error);
      throw error;
    }
      
    return new Response(
      JSON.stringify({ data: data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in search_venues_with_raw_query:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
