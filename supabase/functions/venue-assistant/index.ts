
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the provided OpenAI API key directly
const OPENAI_API_KEY = "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";

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

    // Process the query based on type
    switch (type) {
      case 'home':
        return await handleHomeQuery(query, supabaseClient);
      case 'venue':
        return await handleVenueQuery(query, venueId, supabaseClient);
      case 'voice':
        return await handleVoiceQuery(query, venueId, supabaseClient);
      case 'welcome':
        return await handleWelcomeMessage(venueId, supabaseClient);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid query type' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in venue-assistant function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process your request' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Handle home page queries
async function handleHomeQuery(query: string, supabaseClient: any) {
  try {
    // Extract query intent with OpenAI
    const queryIntent = await analyzeQueryIntent(query);
    
    // Fetch relevant venues based on query intent
    let relevantVenues: any[] = [];
    
    // If the intent includes searching for venues, fetch them
    if (queryIntent.searchVenues) {
      const searchParams = queryIntent.searchParams || {};
      
      // Construct query
      let venuesQuery = supabaseClient.from('venues').select('*');
      
      // Add filters based on searchParams
      if (searchParams.city) {
        venuesQuery = venuesQuery.ilike('city_name', `%${searchParams.city}%`);
      }
      
      if (searchParams.category) {
        venuesQuery = venuesQuery.contains('category_name', [searchParams.category]);
      }
      
      if (searchParams.minCapacity) {
        venuesQuery = venuesQuery.gte('min_capacity', searchParams.minCapacity);
      }
      
      if (searchParams.maxCapacity) {
        venuesQuery = venuesQuery.lte('max_capacity', searchParams.maxCapacity);
      }
      
      if (searchParams.maxPrice) {
        venuesQuery = venuesQuery.lte('starting_price', searchParams.maxPrice);
      }
      
      if (searchParams.amenities && searchParams.amenities.length) {
        const amenity = searchParams.amenities[0];
        venuesQuery = venuesQuery.contains('amenities', [amenity]);
      }
      
      // Execute query with limit
      const { data, error } = await venuesQuery.limit(5);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        relevantVenues = data.map(venue => ({
          id: venue.id,
          name: venue.name,
          description: venue.description || '',
          address: venue.address || '',
          city: venue.city_name || '',
          imageUrl: venue.gallery_images && venue.gallery_images.length > 0 ? venue.gallery_images[0] : null,
          capacity: {
            min: venue.min_capacity || 0,
            max: venue.max_capacity || 0
          },
          pricing: {
            startingPrice: venue.starting_price || 0,
            currency: venue.currency || 'SAR'
          }
        }));
      }
    }
    
    // Generate response using OpenAI
    const response = await generateResponse(query, queryIntent, relevantVenues);
    
    return new Response(
      JSON.stringify({
        answer: response,
        venues: relevantVenues.length > 0 ? relevantVenues : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleHomeQuery:', error);
    throw error;
  }
}

// Handle venue-specific queries
async function handleVenueQuery(query: string, venueId: string, supabaseClient: any) {
  try {
    // Fetch venue data
    const { data: venue, error } = await supabaseClient
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();
      
    if (error) throw error;
    
    if (!venue) {
      return new Response(
        JSON.stringify({ answer: "I couldn't find information for this venue." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Format venue data for prompt
    const venueDetails = {
      name: venue.name,
      description: venue.description || 'No description available',
      location: venue.address || 'Address not specified',
      city: venue.city_name || 'City not specified',
      capacity: `${venue.min_capacity || '0'} to ${venue.max_capacity || '0'} guests`,
      pricing: {
        startingPrice: `${venue.currency || 'SAR'} ${venue.starting_price || 0}`,
        pricePerPerson: venue.price_per_person ? `${venue.currency || 'SAR'} ${venue.price_per_person}` : null,
      },
      amenities: venue.amenities || [],
      features: {
        wifi: venue.wifi ? "Available" : "Not available",
        parking: venue.parking ? "Available" : "Not available",
      },
      availability: venue.availability || [],
      type: venue.type || 'Venue',
      categoryNames: venue.category_name || []
    };
    
    // Generate response using OpenAI
    const answer = await generateVenueResponse(query, venueDetails);
    
    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleVenueQuery:', error);
    throw error;
  }
}

// Handle voice queries (similar to venue queries but optimized for speech)
async function handleVoiceQuery(query: string, venueId: string, supabaseClient: any) {
  try {
    const response = await handleVenueQuery(query, venueId, supabaseClient);
    const data = await response.json();
    
    // Return the same response structure for consistency
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleVoiceQuery:', error);
    throw error;
  }
}

// Generate welcome message for venue assistant
async function handleWelcomeMessage(venueId: string, supabaseClient: any) {
  try {
    // Fetch venue data
    const { data: venue, error } = await supabaseClient
      .from('venues')
      .select('name, type')
      .eq('id', venueId)
      .single();
      
    if (error) throw error;
    
    let welcomeMessage = "Welcome to the venue assistant. How can I help you today?";
    
    if (venue) {
      welcomeMessage = `Welcome! I'm the assistant for ${venue.name}. I can help you learn about this ${venue.type || 'venue'} and answer any questions you might have.`;
    }
    
    return new Response(
      JSON.stringify({ welcome: welcomeMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleWelcomeMessage:', error);
    throw error;
  }
}

// Analyze query intent using OpenAI
async function analyzeQueryIntent(query: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: 
            `You are an AI assistant that analyzes user queries about venues. 
            Extract the search intent and parameters from the query.
            Return ONLY a JSON object with the following structure:
            {
              "searchVenues": boolean, // true if the user is searching for venues
              "searchParams": {
                "city": string or null, // city name if mentioned
                "category": string or null, // category name if mentioned (e.g., wedding, conference, etc.)
                "minCapacity": number or null, // minimum capacity if mentioned
                "maxCapacity": number or null, // maximum capacity if mentioned
                "maxPrice": number or null, // maximum price if mentioned
                "amenities": string[] // array of amenities mentioned (e.g., wifi, parking, etc.)
              },
              "generalInfo": boolean, // true if asking for general information about the platform/service
              "locationInfo": boolean, // true if asking about specific locations
            }`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.3,
        response_format: { "type": "json_object" }
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    const content = result.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing query intent:', error);
    // Return default intent if OpenAI fails
    return {
      searchVenues: true,
      searchParams: {},
      generalInfo: false,
      locationInfo: false
    };
  }
}

// Generate response based on query and intent
async function generateResponse(query: string, intent: any, venues: any[]) {
  try {
    const hasVenues = venues.length > 0;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: 
            `You are an AI assistant for FindVenue, a venue booking platform.
             Answer the user's question about venues, locations, features, and services.
             ${hasVenues ? `I've found ${venues.length} venues that match the query. I'll show them alongside your response.` : "I didn't find any venues matching the query."}
             Keep your response conversational, helpful, and concise (under 100 words).
             If you're suggesting venues, mention that the user can see them below your message.
             Don't include URLs or complex formatting.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Fallback response
    if (venues.length > 0) {
      return `I found ${venues.length} venues that might match what you're looking for. You can check them out below.`;
    } else {
      return "I can help you find venues for your events. Just let me know what you're looking for - like location, capacity, or venue type.";
    }
  }
}

// Generate venue-specific response
async function generateVenueResponse(query: string, venueDetails: any) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: 
            `You are an AI assistant for ${venueDetails.name}, a venue on the FindVenue platform.
             Answer the user's question about this specific venue based on the following details:
             ${JSON.stringify(venueDetails, null, 2)}
             Keep your response conversational, helpful, and concise (under 100 words).
             Don't include URLs or complex formatting.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Error generating venue response:', error);
    
    // Fallback response
    return `${venueDetails.name} is a ${venueDetails.type} that can accommodate ${venueDetails.capacity}. It's located at ${venueDetails.location} in ${venueDetails.city}. How else can I help you with this venue?`;
  }
}

// Import necessary Supabase client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
