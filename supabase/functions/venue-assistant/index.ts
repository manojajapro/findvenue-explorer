
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
    let extractedKeywords: Record<string, string> = {};
    
    // Extract city
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'];
    cities.forEach(city => {
      if (queryLower.includes(city)) {
        extractedKeywords.city = city;
      }
    });
    
    // Extract venue types/categories
    const venueTypes = ['wedding', 'birthday', 'meeting', 'conference', 'hotel', 'hall', 'workshop', 'party', 'marriage'];
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

    // Extract top/best venues
    if (queryLower.includes('top') || queryLower.includes('best') || queryLower.includes('popular')) {
      extractedKeywords.popular = 'true';
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
        let keywordsFound = false;
        
        // Apply filters based on extracted keywords
        if (extractedKeywords.city) {
          venueQuery = venueQuery.ilike('city_name', `%${extractedKeywords.city}%`);
          keywordsFound = true;
        }
        
        if (extractedKeywords.venueType) {
          // Handle both arrays and string fields for category_name
          venueQuery = venueQuery.or(`category_name.cs.{${extractedKeywords.venueType}},category_name.ilike.%${extractedKeywords.venueType}%`);
          keywordsFound = true;
        }
        
        if (extractedKeywords.amenity) {
          venueQuery = venueQuery.contains('amenities', [extractedKeywords.amenity]);
          keywordsFound = true;
        }
        
        if (extractedKeywords.capacity) {
          const capacity = parseInt(extractedKeywords.capacity);
          venueQuery = venueQuery.gte('max_capacity', capacity);
          keywordsFound = true;
        }
        
        if (extractedKeywords.price) {
          const price = parseInt(extractedKeywords.price);
          venueQuery = venueQuery.lte('starting_price', price);
          keywordsFound = true;
        }
        
        if (extractedKeywords.popular) {
          venueQuery = venueQuery.eq('popular', true).order('rating', { ascending: false });
          keywordsFound = true;
        }
        
        // If no specific filters were set and user is asking for halls or venues generally
        if (!keywordsFound && (queryLower.includes('hall') || queryLower.includes('venue'))) {
          // Just get some popular venues as a fallback
          venueQuery = venueQuery.order('rating', { ascending: false });
        }
        
        // Execute the query with a reasonable limit
        venueQuery = venueQuery.limit(5);
        
        const { data: venueData, error: venueError } = await venueQuery;
        
        if (venueError) {
          console.error('Error querying venues:', venueError);
          throw venueError;
        }
        
        // 2. Use OpenAI to generate a response
        const OPENAI_API_KEY = "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";
        if (!OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY not found");
        }
        
        // Prepare venue information for the OpenAI prompt
        let venueContext = "";
        if (venueData && venueData.length > 0) {
          venueContext = `I found ${venueData.length} venues that might be relevant:\n`;
          
          venueData.forEach((venue, index) => {
            const venueType = Array.isArray(venue.category_name) ? venue.category_name.join(', ') : venue.type || 'Venue';
            const amenities = Array.isArray(venue.amenities) ? venue.amenities.join(', ') : 'No specific amenities listed';
            
            venueContext += `Venue ${index + 1}: "${venue.name}" in ${venue.city_name || 'Unknown location'}, ` +
                        `${venueType}, ` +
                        `capacity: ${venue.min_capacity || 'N/A'}-${venue.max_capacity || 'N/A'} people, ` +
                        `starting price: ${venue.currency || 'SAR'} ${venue.starting_price || 'N/A'}, ` +
                        `amenities: ${amenities}.\n`;
          });
        } else {
          // Be more specific about why we couldn't find venues
          if (Object.keys(extractedKeywords).length > 0) {
            venueContext = "I searched for venues with these criteria: ";
            if (extractedKeywords.city) venueContext += `in ${extractedKeywords.city}, `;
            if (extractedKeywords.venueType) venueContext += `for ${extractedKeywords.venueType} events, `;
            if (extractedKeywords.capacity) venueContext += `with capacity for at least ${extractedKeywords.capacity} people, `;
            if (extractedKeywords.price) venueContext += `with price under ${extractedKeywords.price} SAR, `;
            if (extractedKeywords.amenity) venueContext += `with ${extractedKeywords.amenity}, `;
            venueContext += "but couldn't find any exact matches in our database.";
          } else {
            venueContext = "I couldn't find any venues matching those criteria in our database.";
          }
        }
        
        console.log("Prepared venue context:", venueContext);
        
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
                content: `You are a helpful venue booking assistant for FindVenue, a platform that helps users find and book venues in Saudi Arabia. 
                         Your job is to provide helpful, conversational answers based on the venue data provided.
                         If you have venue data, mention the specific venues by name and highlight key features.
                         Be conversational and friendly, making the user feel understood.
                         When mentioning prices, always include the currency (SAR).
                         If a user is looking for something specific (wedding halls, conference rooms, etc.) and we don't have exact matches,
                         suggest alternatives or recommend they try with broader criteria.
                         Never make up information about specific venues that isn't in the data provided.
                         If the user query is a simple greeting or small talk, respond in a friendly way without forcing venue information.
                         Keep answers focused and relevant to the user's query.`
              },
              {
                role: "user",
                content: `The user asked: "${query}"\n\nHere is the venue data I have:\n${venueContext}`
              }
            ],
            temperature: 0.7,
            max_tokens: 400,
          }),
        });

        const openaiData = await openaiResponse.json();
        
        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          const answer = openaiData.choices[0].message.content.trim();
          console.log("OpenAI response:", answer);
          return new Response(
            JSON.stringify({ answer }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error("Invalid OpenAI response:", openaiData);
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
