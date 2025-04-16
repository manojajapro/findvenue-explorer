
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
    const extractedKeywords: Record<string, string | string[] | number> = {};
    
    // Extract city
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'tabuk', 'abha'];
    cities.forEach(city => {
      if (queryLower.includes(city)) {
        extractedKeywords.city = city;
      }
    });
    
    // Extract venue types/categories
    const venueTypes = ['wedding', 'birthday', 'meeting', 'conference', 'hotel', 'hall', 'workshop', 'party', 'exhibition', 'training'];
    const foundTypes: string[] = [];
    venueTypes.forEach(type => {
      if (queryLower.includes(type)) {
        foundTypes.push(type);
      }
    });
    
    if (foundTypes.length > 0) {
      extractedKeywords.venueTypes = foundTypes;
    }
    
    // Extract amenities
    const amenities = ['wifi', 'parking', 'catering', 'dining', 'projector', 'sound system', 'decoration'];
    const foundAmenities: string[] = [];
    amenities.forEach(amenity => {
      if (queryLower.includes(amenity)) {
        foundAmenities.push(amenity);
      }
    });
    
    if (foundAmenities.length > 0) {
      extractedKeywords.amenities = foundAmenities;
    }
    
    // Extract capacity
    const capacityMatch = queryLower.match(/(\d+)(?:\s*(?:people|guests|persons|capacity))/);
    if (capacityMatch) {
      extractedKeywords.capacity = parseInt(capacityMatch[1]);
    }
    
    // Extract price range
    const priceMatch = queryLower.match(/(\d+)(?:\s*(?:sar|price|cost))/);
    if (priceMatch) {
      extractedKeywords.price = parseInt(priceMatch[1]);
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
        // Build a query based on the extracted keywords
        let venueQuery = supabaseClient.from('venues').select('*');
        
        // Apply filters based on extracted keywords
        if (extractedKeywords.city) {
          venueQuery = venueQuery.ilike('city_name', `%${extractedKeywords.city}%`);
        }
        
        if (extractedKeywords.venueTypes && Array.isArray(extractedKeywords.venueTypes)) {
          const types = extractedKeywords.venueTypes;
          // Create an OR condition for each venue type in the category_name array
          const typeFilters = types.map(type => `category_name.cs.{"${type}"}`);
          if (typeFilters.length > 0) {
            venueQuery = venueQuery.or(typeFilters.join(','));
          }
        }
        
        if (extractedKeywords.amenities && Array.isArray(extractedKeywords.amenities)) {
          const amenitiesList = extractedKeywords.amenities;
          // Create an OR condition for each amenity in the amenities array
          const amenityFilters = amenitiesList.map(amenity => `amenities.cs.{"${amenity}"}`);
          if (amenityFilters.length > 0) {
            venueQuery = venueQuery.or(amenityFilters.join(','));
          }
        }
        
        if (extractedKeywords.capacity && typeof extractedKeywords.capacity === 'number') {
          const capacity = extractedKeywords.capacity;
          venueQuery = venueQuery.gte('max_capacity', capacity);
        }
        
        if (extractedKeywords.price && typeof extractedKeywords.price === 'number') {
          const price = extractedKeywords.price;
          venueQuery = venueQuery.lte('starting_price', price);
        }
        
        // If no specific filters were applied but we have text, do a general search
        if (Object.keys(extractedKeywords).length === 0) {
          if (queryLower.includes('list') || 
              queryLower.includes('show') || 
              queryLower.includes('find') ||
              queryLower.includes('venues')) {
            
            // Try to extract city from query
            for (const city of cities) {
              if (queryLower.includes(city)) {
                venueQuery = venueQuery.ilike('city_name', `%${city}%`);
                break;
              }
            }
          } else {
            // Search venue name, description, and city
            venueQuery = venueQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,city_name.ilike.%${query}%`);
          }
        }
        
        // Limit results
        venueQuery = venueQuery.limit(5);
        
        // Execute the query
        const { data: venueData, error: venueError } = await venueQuery;
        
        if (venueError) {
          console.error('Error querying venues:', venueError);
          throw venueError;
        }
        
        // Generate a response based on the venue data
        let answer = "";
        if (venueData && venueData.length > 0) {
          if (extractedKeywords.city || queryLower.includes('list') || queryLower.includes('show') || queryLower.includes('find')) {
            const cityName = extractedKeywords.city || cities.find(city => queryLower.includes(city)) || '';
            const cityText = cityName ? ` in ${cityName}` : '';
            
            if (extractedKeywords.venueTypes && Array.isArray(extractedKeywords.venueTypes) && extractedKeywords.venueTypes.length > 0) {
              answer = `I found ${venueData.length} ${extractedKeywords.venueTypes.join('/')} venues${cityText} that might be of interest to you.`;
            } else {
              answer = `I found ${venueData.length} venues${cityText} that might match what you're looking for.`;
            }
          } else {
            answer = `I found ${venueData.length} venues that might be relevant to your search.`;
          }
          
          // Add some details about each venue
          if (venueData.length === 1) {
            const venue = venueData[0];
            answer += ` ${venue.name} is located in ${venue.city_name}`;
            if (venue.starting_price) {
              answer += ` with prices starting at ${venue.currency || 'SAR'} ${venue.starting_price}`;
            }
            if (venue.max_capacity) {
              answer += ` and can accommodate up to ${venue.max_capacity} people`;
            }
            answer += '.';
            
            // Add amenities if available
            if (venue.amenities && Array.isArray(venue.amenities) && venue.amenities.length > 0) {
              answer += ` It offers amenities like ${venue.amenities.slice(0, 3).join(', ')}`;
              if (venue.amenities.length > 3) {
                answer += ' and more';
              }
              answer += '.';
            }
          } else {
            // For multiple venues, just mention you'll show them below
            answer += ` You can check them out below.`;
          }
        } else {
          answer = "I couldn't find any venues matching your criteria. Try broadening your search or checking our venues page for all available options.";
        }
        
        // Get OpenAI to refine the response if we have the API key
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (OPENAI_API_KEY) {
          try {
            const venueContext = venueData && venueData.length > 0 ? 
              venueData.map((venue, i) => {
                return `Venue ${i+1}: ${venue.name} in ${venue.city_name}, ` +
                      `capacity: ${venue.min_capacity || 'N/A'}-${venue.max_capacity || 'N/A'}, ` +
                      `price: ${venue.currency || 'SAR'} ${venue.starting_price || 'N/A'}, ` +
                      `amenities: ${Array.isArray(venue.amenities) ? venue.amenities.join(', ') : 'N/A'}, ` +
                      `categories: ${Array.isArray(venue.category_name) ? venue.category_name.join(', ') : 'N/A'}`;
              }).join('\n') : "No venues found";
            
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
                    content: `The user asked: "${query}"\n\nHere is the venue data I have:\n${venueContext}\n\nHere's a draft response: ${answer}\n\nImprove this response to be more natural and helpful, but keep it concise.`
                  }
                ],
                temperature: 0.7,
                max_tokens: 300,
              }),
            });

            const openaiData = await openaiResponse.json();
            
            if (openaiData.choices && openaiData.choices[0]?.message?.content) {
              answer = openaiData.choices[0].message.content.trim();
            }
          } catch (openaiError) {
            console.error("Error with OpenAI:", openaiError);
            // Use the basic answer if OpenAI fails
          }
        }
        
        return new Response(
          JSON.stringify({ 
            answer,
            venues: venueData || [] 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error("Error processing chat:", error);
        
        return new Response(
          JSON.stringify({ 
            answer: "I'm sorry, I encountered an error while searching for venues. Please try again with different criteria or browse our venues page.",
            error: error.message 
          }),
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
