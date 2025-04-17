
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const body = await req.json();
    const { query, venueId, type } = body;
    
    // Basic input validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const queryLower = query.toLowerCase();
    
    // Welcome messages and simple greetings
    const welcomeResponses = [
      "👋 Hello! I'm your FindVenue AI assistant. Ready to help you discover the perfect venue and plan an amazing event in Saudi Arabia!",
      "🌟 Welcome to FindVenue! I can help you find venues, suggest event themes, and provide planning tips across Saudi Arabia's top cities.",
      "💡 Need venue ideas or event planning advice? I'm here to make your event planning smooth and exciting!"
    ];

    if (type === 'welcome' || /^(hi|hello|hey|howdy|greetings|hola|what's up|yo)$/i.test(query.trim())) {
      return new Response(
        JSON.stringify({ 
          answer: welcomeResponses[Math.floor(Math.random() * welcomeResponses.length)] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Comprehensive venue search logic
    const extractSearchCriteria = () => {
      const criteria: any = {};
      
      // City detection
      const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'taif', 'abha'];
      const foundCity = cities.find(city => queryLower.includes(city));
      if (foundCity) criteria.city = foundCity;

      // Venue type detection
      const venueTypes = {
        'wedding': ['wedding', 'marriage', 'bride', 'groom', 'ceremony', 'reception'],
        'conference': ['conference', 'meeting', 'seminar', 'workshop', 'corporate', 'business'],
        'party': ['party', 'birthday', 'celebration', 'anniversary', 'festivity'],
        'exhibition': ['exhibition', 'showcase', 'expo', 'fair'],
        'concert': ['concert', 'performance', 'show', 'music', 'live'],
        'hall': ['hall', 'ballroom', 'venue', 'space', 'auditorium']
      };

      for (const [type, keywords] of Object.entries(venueTypes)) {
        if (keywords.some(keyword => queryLower.includes(keyword))) {
          criteria.venueType = type;
          break;
        }
      }

      // Capacity detection
      const capacityMatch = queryLower.match(/(\d+)(?:\s*(?:people|guests|persons?|capacity))/);
      if (capacityMatch) criteria.capacity = parseInt(capacityMatch[1]);

      // Price range detection
      const priceMatch = queryLower.match(/(\d+)(?:\s*(?:sar|price|budget|\$))/);
      if (priceMatch) criteria.maxPrice = parseInt(priceMatch[1]);

      // Amenities detection
      const amenities = ['wifi', 'parking', 'catering', 'av equipment', 'stage', 'outdoor space'];
      const foundAmenities = amenities.filter(amenity => queryLower.includes(amenity));
      if (foundAmenities.length) criteria.amenities = foundAmenities;

      return criteria;
    };

    // Perform venue search based on extracted criteria
    const searchVenues = async (criteria) => {
      let query = supabaseClient.from('venues').select('*');

      if (criteria.city) query = query.ilike('city_name', `%${criteria.city}%`);
      if (criteria.venueType) query = query.contains('category_name', [criteria.venueType]);
      if (criteria.capacity) query = query.gte('max_capacity', criteria.capacity);
      if (criteria.maxPrice) query = query.lte('starting_price', criteria.maxPrice);
      if (criteria.amenities) {
        criteria.amenities.forEach(amenity => {
          query = query.contains('amenities', [amenity]);
        });
      }

      query = query.order('rating', { ascending: false }).limit(5);

      const { data: venues, error } = await query;
      
      return { venues, error };
    };

    // Event planning query detection
    const isEventPlanningQuery = () => {
      const planningKeywords = [
        'plan', 'organize', 'theme', 'layout', 'decor', 'vendor', 
        'catering', 'budget', 'schedule', 'timeline'
      ];
      return planningKeywords.some(keyword => queryLower.includes(keyword));
    };

    // Perform venue search and generate response
    const searchCriteria = extractSearchCriteria();
    const { venues, error } = await searchVenues(searchCriteria);

    if (error) {
      console.error('Venue search error:', error);
      return new Response(
        JSON.stringify({ answer: "Sorry, I encountered an issue searching venues." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate response using OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: `You are a helpful FindVenue AI assistant. Provide concise, friendly advice about venues and event planning in Saudi Arabia.`
          },
          {
            role: "user",
            content: `Query: ${query}
             Search Criteria: ${JSON.stringify(searchCriteria)}
             Venues Found: ${venues ? venues.map(v => v.name).join(', ') : 'No venues'}
             
             ${isEventPlanningQuery() 
               ? "Provide event planning tips tailored to the query and found venues." 
               : "Help the user understand venue search results and next steps."}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const aiData = await openaiResponse.json();
    const answer = aiData?.choices?.[0]?.message?.content?.trim() 
      || "I'm ready to help you find the perfect venue and plan an amazing event!";

    return new Response(
      JSON.stringify({ 
        answer, 
        venues: venues?.map(v => ({
          name: v.name,
          city: v.city_name,
          capacity: `${v.min_capacity}-${v.max_capacity}`,
          price: `SAR ${v.starting_price}`
        })) || [] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Venue Assistant Error:", error);
    return new Response(
      JSON.stringify({ 
        answer: "I'm having trouble processing your request. Please try again later.",
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
