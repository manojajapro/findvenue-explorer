
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
    const { query, venueId, type } = body;
    
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
    let extractedKeywords: Record<string, string | number | boolean> = {};
    
    // Check if this is a simple greeting
    const isSimpleGreeting = /^(hi|hello|hey|howdy|greetings|hola|what's up|yo|good (morning|afternoon|evening)|hiya)$/i.test(query.trim());
    
    // If it's a welcome message or simple greeting, generate a welcome
    if (type === 'welcome' || isSimpleGreeting) {
      return new Response(
        JSON.stringify({ 
          answer: "Hello there! 👋 I'm the FindVenue assistant. I can help you discover the perfect venue for your event in Saudi Arabia and assist with your event planning. Feel free to ask about venues, event themes, layouts, vendor recommendations, or budget planning. How can I help you today?"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for a city listing request (e.g., "list riyadh venues" or "show venues in jeddah")
    const cityListingMatch = queryLower.match(/(?:list|show|find|get|display|venues? in|venues? at|venues? from) (\w+)(?:\s+venues?)?/i);
    let isCityListingQuery = false;
    
    if (cityListingMatch && cityListingMatch[1]) {
      const potentialCity = cityListingMatch[1].toLowerCase();
      const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'taif', 'abha'];
      
      if (cities.includes(potentialCity)) {
        extractedKeywords.city = potentialCity;
        isCityListingQuery = true;
        console.log(`Detected city listing query for: ${potentialCity}`);
      }
    }
    
    // Extract city
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina', 'khobar', 'taif', 'abha'];
    cities.forEach(city => {
      if (queryLower.includes(city)) {
        extractedKeywords.city = city;
      }
    });
    
    // Extract venue types/categories with more comprehensive matching
    const venueTypes = {
      'wedding': ['wedding', 'marriage', 'bride', 'groom', 'ceremony', 'reception', 'bridal'],
      'conference': ['conference', 'meeting', 'seminar', 'workshop', 'corporate', 'business'],
      'party': ['party', 'celebration', 'birthday', 'anniversary', 'festivity'],
      'exhibition': ['exhibition', 'showcase', 'display', 'expo', 'fair'],
      'concert': ['concert', 'performance', 'show', 'music', 'live'],
      'hall': ['hall', 'ballroom', 'venue', 'space', 'auditorium']
    };
    
    Object.entries(venueTypes).forEach(([type, keywords]) => {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          extractedKeywords.venueType = type;
          break;
        }
      }
    });
    
    // Extract amenities with more extensive matching
    const amenityMap = {
      'wifi': ['wifi', 'internet', 'connection', 'wireless'],
      'parking': ['parking', 'car', 'vehicle', 'valet'],
      'catering': ['catering', 'food', 'meal', 'cuisine', 'dining'],
      'av': ['av', 'audio', 'visual', 'sound', 'projector', 'screen', 'microphone'],
      'stage': ['stage', 'platform', 'podium'],
      'seating': ['seating', 'chairs', 'tables', 'arrangement']
    };
    
    Object.entries(amenityMap).forEach(([amenity, keywords]) => {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          extractedKeywords.amenity = amenity;
          break;
        }
      }
    });
    
    // Extract capacity with improved regex
    const capacityMatch = queryLower.match(/(\d+)(?:\s*(?:people|guests|persons?|capacity|attendees|visitors|seats))/);
    if (capacityMatch) {
      extractedKeywords.capacity = parseInt(capacityMatch[1]);
    }
    
    // Extract price range with improved regex
    const priceMatch = queryLower.match(/(\d+)(?:\s*(?:sar|price|cost|budget|\$|dollar|money))/);
    if (priceMatch) {
      extractedKeywords.price = parseInt(priceMatch[1]);
    }

    // Extract top/best/popular venues
    if (queryLower.match(/\b(top|best|popular|highest rated|recommended|featured|premium)\b/)) {
      extractedKeywords.premium = true;
    }
    
    // Check for specific venue request by ID
    if (venueId) {
      extractedKeywords.venueId = venueId;
    }

    // Detect event planning queries
    const isEventPlanningQuery = queryLower.includes('plan') || 
                               queryLower.includes('theme') || 
                               queryLower.includes('layout') || 
                               queryLower.includes('decor') || 
                               queryLower.includes('vendor') || 
                               queryLower.includes('catering') ||
                               queryLower.includes('organize') ||
                               queryLower.includes('budget') ||
                               queryLower.includes('schedule') ||
                               queryLower.match(/how (to|do I|should I) (plan|organize|set up|arrange)/);
    
    // For venue-specific chat when we have a venueId
    if (type === 'chat' && venueId) {
      try {
        // Fetch specific venue details
        const { data: venueData, error: venueError } = await supabaseClient
          .from('venues')
          .select('*')
          .eq('id', venueId)
          .single();
        
        if (venueError) {
          console.error('Error fetching venue details:', venueError);
          throw venueError;
        }
        
        if (!venueData) {
          throw new Error('Venue not found');
        }
        
        // Format venue info for the AI prompt
        const venueInfo = `
          Venue Name: ${venueData.name}
          Location: ${venueData.address || ''}, ${venueData.city_name || ''}
          Category: ${Array.isArray(venueData.category_name) ? venueData.category_name.join(', ') : venueData.category_name || 'Venue'}
          Capacity: ${venueData.min_capacity || 'N/A'}-${venueData.max_capacity || 'N/A'} people
          Starting Price: ${venueData.currency || 'SAR'} ${venueData.starting_price || 'N/A'}
          Price Per Person: ${venueData.price_per_person ? `${venueData.currency || 'SAR'} ${venueData.price_per_person}` : 'N/A'}
          Amenities: ${Array.isArray(venueData.amenities) ? venueData.amenities.join(', ') : 'None listed'}
          Availability: ${Array.isArray(venueData.availability) ? venueData.availability.join(', ') : 'Contact for availability'}
          Rating: ${venueData.rating || 'Not yet rated'} (${venueData.reviews_count || 0} reviews)
          Features: ${venueData.wifi ? 'WiFi Available, ' : ''}${venueData.parking ? 'Parking Available' : ''}
          Description: ${venueData.description || 'No detailed description available.'}
        `;
        
        // Use OpenAI for venue-specific responses
        const OPENAI_API_KEY = "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";
        
        console.log("Querying OpenAI for venue-specific chat");
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a helpful venue booking and event planning assistant for FindVenue. You provide detailed information about a specific venue and offer event planning advice.
                         Be friendly, conversational, and informative. Focus on answering the user's questions about the specific venue
                         using the venue information provided. If the user asks about something not mentioned in the venue data,
                         politely explain that you don't have that specific information and suggest they contact the venue directly.
                         
                         If the user is asking about event planning at this venue, offer creative and practical suggestions for:
                         - Event themes that would work well in this space
                         - Layout and seating arrangements based on the venue capacity and type
                         - Decoration ideas suitable for the venue style
                         - Vendor recommendations (like catering, photographers, music) appropriate for the venue
                         - Budget planning advice taking into account the venue's starting price
                         
                         Format your responses in a friendly, conversational style. Use emojis occasionally to make your responses friendly.`
              },
              {
                role: "user",
                content: `The user asked: "${query}"\n\nHere is the detailed information about the venue:\n${venueInfo}`
              }
            ],
            temperature: 0.7,
            max_tokens: 700,
          }),
        });

        const openaiData = await openaiResponse.json();
        
        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          const answer = openaiData.choices[0].message.content.trim();
          console.log("OpenAI venue-specific response:", answer);
          return new Response(
            JSON.stringify({ answer }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error("Invalid OpenAI response for venue-specific query:", openaiData);
          throw new Error("Invalid response from OpenAI API");
        }
      } catch (error) {
        console.error("Error in venue-specific chat:", error);
        return new Response(
          JSON.stringify({ 
            answer: "I'm sorry, I encountered an issue retrieving information about this venue. Please try again or contact customer support for assistance."
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // For general venue search and chat
    if (type === 'chat') {
      try {
        // 1. First, try to get relevant venues based on the query
        let venueQuery = supabaseClient.from('venues').select('*');
        let keywordsFound = false;
        let queryFilters = [];
        
        // Apply filters based on extracted keywords
        if (extractedKeywords.city) {
          const cityStr = String(extractedKeywords.city);
          venueQuery = venueQuery.ilike('city_name', `%${cityStr}%`);
          keywordsFound = true;
          queryFilters.push(`in ${cityStr}`);
        }
        
        if (extractedKeywords.venueType) {
          // Handle both arrays and string fields for category_name
          const venueTypeStr = String(extractedKeywords.venueType);
          venueQuery = venueQuery.or(`category_name.cs.{${venueTypeStr}},category_name.ilike.%${venueTypeStr}%`);
          keywordsFound = true;
          queryFilters.push(`for ${venueTypeStr} events`);
        }
        
        if (extractedKeywords.amenity) {
          venueQuery = venueQuery.contains('amenities', [String(extractedKeywords.amenity)]);
          keywordsFound = true;
          queryFilters.push(`with ${extractedKeywords.amenity}`);
        }
        
        if (extractedKeywords.capacity) {
          const capacity = Number(extractedKeywords.capacity);
          venueQuery = venueQuery.gte('max_capacity', capacity);
          keywordsFound = true;
          queryFilters.push(`with capacity for at least ${capacity} people`);
        }
        
        if (extractedKeywords.price) {
          const price = Number(extractedKeywords.price);
          venueQuery = venueQuery.lte('starting_price', price);
          keywordsFound = true;
          queryFilters.push(`with starting price under ${price} SAR`);
        }
        
        if (extractedKeywords.premium) {
          venueQuery = venueQuery.order('rating', { ascending: false });
          keywordsFound = true;
          queryFilters.push('highest rated first');
        }
        
        // Special case for city listing queries
        if (isCityListingQuery) {
          // For "list X venues" type queries, we prioritize showing results
          venueQuery = venueQuery.order('rating', { ascending: false });
          keywordsFound = true;
        }
        
        // If no specific filters were set but query contains venue-related terms
        if (!keywordsFound && 
            (queryLower.includes('venue') || 
             queryLower.includes('hall') || 
             queryLower.includes('place') ||
             queryLower.includes('location') ||
             queryLower.includes('space') ||
             queryLower.includes('room'))) {
          venueQuery = venueQuery.order('rating', { ascending: false });
          queryFilters.push('best rated venues');
        }
        
        // Execute the query with a reasonable limit
        venueQuery = venueQuery.limit(7);
        
        const { data: venueData, error: venueError } = await venueQuery;
        
        if (venueError) {
          console.error('Error querying venues:', venueError);
          throw venueError;
        }
        
        // Get a count of all venues for informational purposes
        const { count: totalVenueCount, error: countError } = await supabaseClient
          .from('venues')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error('Error counting venues:', countError);
          // Non-fatal, continue with the query
        }
        
        // 2. Use OpenAI to generate a response
        const OPENAI_API_KEY = "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";
        
        // Prepare venue information for the OpenAI prompt
        let venueContext = "";
        let searchContext = "";
        
        if (queryFilters.length > 0) {
          searchContext = `I searched for venues ${queryFilters.join(', ')}.`;
        }
        
        if (venueData && venueData.length > 0) {
          venueContext = `I found ${venueData.length} venues that match your search criteria:\n\n`;
          
          venueData.forEach((venue, index) => {
            const venueType = Array.isArray(venue.category_name) ? venue.category_name.join(', ') : (venue.category_name || venue.type || 'Venue');
            const amenities = Array.isArray(venue.amenities) ? venue.amenities.join(', ') : 'No specific amenities listed';
            
            venueContext += `Venue ${index + 1}: "${venue.name}" in ${venue.city_name || 'Unknown location'}, ` +
                        `Type: ${venueType}, ` +
                        `Capacity: ${venue.min_capacity || 'N/A'}-${venue.max_capacity || 'N/A'} people, ` +
                        `Starting Price: ${venue.currency || 'SAR'} ${venue.starting_price || 'N/A'}, ` +
                        `Rating: ${venue.rating || 'Not rated'}/5 (${venue.reviews_count || 0} reviews), ` +
                        `Amenities: ${amenities}` +
                        (venue.description ? `, Description: ${venue.description.substring(0, 100)}...` : '') + 
                        `.\n\n`;
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
        
        // Add general database information
        venueContext += `\nInformation about our venue database: We have approximately ${totalVenueCount || 'many'} venues across Saudi Arabia, primarily in major cities like Riyadh, Jeddah, and Dammam.`;
        
        // Determine if this is an event planning query
        const eventPlanningPrompt = isEventPlanningQuery ? `
          It seems the user is asking about event planning. Provide helpful advice on:
          - Event themes and concepts appropriate for the event type and venues mentioned
          - Layout suggestions and space utilization tips
          - Decor ideas that match the venue style or event type
          - Vendor recommendations (photographers, caterers, entertainers, etc.)
          - Budget planning advice including venue costs, catering, decor and other elements
          - Timeline suggestions for event planning
          
          If specific venues were found in the search, tailor your event planning advice to those venues.
          If no specific venues were found, provide general event planning advice based on the user's query.
        ` : "";
        
        console.log("Querying OpenAI with context:", venueContext.substring(0, 200) + "...");
        
        // For simple city listing queries, create a more direct response format
        let systemPrompt = `You are a helpful venue booking and event planning assistant for FindVenue, a platform that helps users find and book venues in Saudi Arabia.
                         Your job is to provide helpful, conversational answers based on the venue data provided and give expert event planning advice.
                         
                         Be detailed and thorough in your responses, highlighting key features of venues that match the query.
                         If you have venue data, mention the specific venues by name and highlight their key features.
                         If the user is asking for recommendations, suggest specific venues from the data provided.
                         
                         For event planning questions, offer creative and practical suggestions on:
                         - Event themes appropriate for the venue and occasion
                         - Layout and seating arrangements
                         - Decoration ideas
                         - Vendor recommendations (catering, photographers, entertainers)
                         - Budget planning advice
                         - Timeline and checklist suggestions
                         
                         Be conversational, friendly, and helpful, making the user feel understood.
                         When mentioning prices, always include the currency (SAR).
                         If the user is looking for something specific that we don't have exact matches for,
                         suggest the closest alternatives available or recommend they try with broader criteria.
                         Never make up information about specific venues that isn't in the data provided.
                         If the user query is a simple greeting or small talk, respond in a friendly way.
                         Keep answers focused and relevant to the user's query about venues and event planning.
                         Use emoji occasionally to make your responses friendly 😊.`;
                         
        // For city listing queries, use a more structured response format
        if (isCityListingQuery) {
          systemPrompt += `\n\nFor city listing queries (like "show venues in Riyadh"), structure your response like this:
                            1. Brief introduction mentioning the city and how many venues you found
                            2. Structured list of venues with their key details (name, type, capacity, price)
                            3. Brief conclusion with suggestion on how to learn more about any specific venue`;
        }
        
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: `The user asked: "${query}"\n\n${searchContext}\n\nHere is the venue data I have:\n${venueContext}\n\n${eventPlanningPrompt}`
              }
            ],
            temperature: 0.7,
            max_tokens: 900,
          }),
        });

        const openaiData = await openaiResponse.json();
        
        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          const answer = openaiData.choices[0].message.content.trim();
          console.log("OpenAI response:", answer.substring(0, 100) + "...");
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
        
        // Fallback to a generic response
        let answer = "I'm sorry, I encountered an issue while searching our venue database. You can try asking in a different way or browse all venues on our website. Is there something specific you're looking for?";
        
        return new Response(
          JSON.stringify({ answer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return a generic response for other request types
    return new Response(
      JSON.stringify({ answer: "I'm here to help you find the perfect venue for your event and assist with event planning. How can I help you today?" }),
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
