
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Parse the request body
    const body = await req.json();
    const { query, type } = body;
    
    // Log the incoming request for debugging
    console.log(`Received ${type} request: ${query}`);
    
    // Basic validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Extract keywords for venue search
    const queryLower = query.toLowerCase();
    const extractedKeywords: Record<string, string> = {};
    
    // Extract city
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'];
    cities.forEach(city => {
      if (queryLower.includes(city)) {
        extractedKeywords.city = city;
      }
    });
    
    // Extract venue types/categories
    const venueTypes = ['wedding', 'birthday', 'meeting', 'conference', 'hotel', 'hall', 'workshop', 'party'];
    venueTypes.forEach(type => {
      if (queryLower.includes(type)) {
        extractedKeywords.venueType = type;
      }
    });
    
    // Extract amenities
    const amenities = ['wifi', 'parking', 'catering', 'dining'];
    amenities.forEach(amenity => {
      if (queryLower.includes(amenity)) {
        extractedKeywords.amenity = amenity;
      }
    });
    
    // Extract capacity
    const capacityMatch = queryLower.match(/(\d+)(?:\s*(?:people|guests|persons|capacity))/);
    if (capacityMatch) {
      extractedKeywords.capacity = capacityMatch[1];
    }
    
    // Extract price range
    const priceMatch = queryLower.match(/(\d+)(?:\s*(?:sar|price|cost))/);
    if (priceMatch) {
      extractedKeywords.price = priceMatch[1];
    }
    
    // If it's a welcome message, generate a welcome
    if (type === 'welcome') {
      return new Response(
        JSON.stringify({ 
          welcome: "Welcome to the FindVenue assistant! I can help you discover the perfect venue for your event. Ask me about venues in specific cities, with certain amenities, or for particular occasions."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For chat messages, query the database and use OpenAI to generate responses
    if (type === 'chat') {
      try {
        // 1. First, try to get relevant venues based on the query
        let venueQuery = supabaseClient.from('venues').select('*');
        
        // Apply filters based on extracted keywords
        if (extractedKeywords.city) {
          venueQuery = venueQuery.ilike('city_name', `%${extractedKeywords.city}%`);
        }
        
        if (extractedKeywords.venueType) {
          venueQuery = venueQuery.contains('category_name', [extractedKeywords.venueType]);
        }
        
        if (extractedKeywords.amenity) {
          venueQuery = venueQuery.contains('amenities', [extractedKeywords.amenity]);
        }
        
        if (extractedKeywords.capacity) {
          const capacity = parseInt(extractedKeywords.capacity);
          venueQuery = venueQuery.gte('max_capacity', capacity);
        }
        
        if (extractedKeywords.price) {
          const price = parseInt(extractedKeywords.price);
          venueQuery = venueQuery.lte('starting_price', price);
        }
        
        // Limit results
        venueQuery = venueQuery.limit(5);
        
        // Execute the query
        const { data: venueData, error: venueError } = await venueQuery;
        
        if (venueError) {
          console.error('Error querying venues:', venueError);
          throw venueError;
        }
        
        // 2. Use OpenAI to generate a response
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY not found in environment variables");
        }
        
        // Prepare venue information for the OpenAI prompt
        let venueContext = "";
        if (venueData && venueData.length > 0) {
          venueContext = `I found ${venueData.length} venues that might be relevant:\n`;
          
          venueData.forEach((venue, index) => {
            venueContext += `Venue ${index + 1}: "${venue.name}" in ${venue.city_name}, ${venue.type || 'Venue'}, ` +
                          `capacity: ${venue.min_capacity || 'N/A'}-${venue.max_capacity || 'N/A'} people, ` +
                          `starting price: ${venue.currency || 'SAR'} ${venue.starting_price || 'N/A'}, ` +
                          `amenities: ${(venue.amenities || []).join(', ')}.\n`;
          });
        } else {
          venueContext = "I couldn't find any venues matching exactly those criteria in our database.";
        }
        
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a helpful venue booking assistant. You help users find venues for their events based on their requirements.
                         Your job is to provide helpful, concise answers based on the venue data provided.
                         If you have venue data, mention the specific venues by name and highlight key features.
                         If the user is asking a question that doesn't seem to be about finding venues, still try to be helpful.
                         Keep responses friendly, concise (under 150 words), and focused on directly answering the user's query.
                         When mentioning prices, always include the currency (SAR).
                         Don't apologize for limitations in data - just work with what you have.
                         Never make up information about specific venues that isn't in the data provided.
                         If you don't have enough venues, suggest the user try with broader criteria.`
              },
              {
                role: "user",
                content: `The user asked: "${query}"\n\nHere is the venue data I have:\n${venueContext}`
              }
            ],
            temperature: 0.7,
            max_tokens: 300,
          }),
        });

        const openaiData = await openaiResponse.json();
        
        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          const answer = openaiData.choices[0].message.content.trim();
          return new Response(
            JSON.stringify({ answer }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error("Invalid response from OpenAI API");
        }
      } catch (error) {
        console.error("OpenAI API error or database error:", error);
        
        // Fallback to a generic response based on the query
        let answer = "I'm sorry, I couldn't find specific information about that in our venue database. You can try asking in a different way or browse our venues page to see all available options.";
        
        return new Response(
          JSON.stringify({ answer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return a generic response for other request types
    return new Response(
      JSON.stringify({ answer: "I'm here to help you find venues. How can I assist you today?" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error processing venue assistant request:", error);
    
    return new Response(
      JSON.stringify({ error: "Failed to process your request", message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
