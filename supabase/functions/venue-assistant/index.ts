
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
    const { query, venueId, type, enhancedSearch } = body;

    // Log the incoming request for debugging
    console.log(`Received ${type} request: ${query}`);
    console.log('Enhanced search parameters:', enhancedSearch || 'none');
    
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
        return await handleHomeQuery(query, supabaseClient, enhancedSearch);
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
async function handleHomeQuery(query: string, supabaseClient: any, enhancedSearch?: any) {
  try {
    // Extract query intent with OpenAI
    const queryIntent = await analyzeQueryIntent(query, enhancedSearch);
    
    // Generate suggested follow-up queries based on the user's question
    const suggestedQueries = await generateSuggestedQueries(query, queryIntent);
    
    console.log('Query intent analysis:', JSON.stringify(queryIntent, null, 2));
    
    // Fetch relevant venues based on query intent
    let relevantVenues: any[] = [];
    
    // If the intent includes searching for venues, fetch them
    if (queryIntent.searchVenues) {
      const searchParams = queryIntent.searchParams || {};
      
      // Construct query
      let venuesQuery = supabaseClient.from('venues').select('*');
      
      // Add filters based on searchParams with improved matching
      if (searchParams.city) {
        venuesQuery = venuesQuery.ilike('city_name', `%${searchParams.city}%`);
      }
      
      if (searchParams.category) {
        // For category, check if it's in the array of category names
        if (Array.isArray(searchParams.category)) {
          // Multiple categories, ANY match
          const categoryFilter = searchParams.category.map(cat => `%${cat}%`);
          venuesQuery = venuesQuery.or(categoryFilter.map(cat => `category_name.ilike.${cat}`).join(','));
        } else {
          venuesQuery = venuesQuery.ilike('category_name::text', `%${searchParams.category}%`);
        }
      }
      
      if (searchParams.type) {
        venuesQuery = venuesQuery.ilike('type', `%${searchParams.type}%`);
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
        if (Array.isArray(searchParams.amenities)) {
          // Filter venues that contain ANY of the specified amenities
          const amenityConditions = searchParams.amenities.map(amenity => 
            `amenities::text ILIKE '%${amenity}%'`
          );
          venuesQuery = venuesQuery.or(amenityConditions.join(','));
        } else {
          venuesQuery = venuesQuery.contains('amenities', [searchParams.amenities]);
        }
      }

      if (searchParams.features) {
        if (searchParams.features.includes('wifi')) {
          venuesQuery = venuesQuery.eq('wifi', true);
        }
        if (searchParams.features.includes('parking')) {
          venuesQuery = venuesQuery.eq('parking', true);
        }
      }
      
      // Execute query with limit
      const { data, error } = await venuesQuery.limit(5);
      
      if (error) {
        console.error('Venue query error:', error);
        throw error;
      }
      
      if (data) {
        console.log(`Found ${data.length} venues matching the query`);
        
        relevantVenues = data.map(venue => ({
          id: venue.id,
          name: venue.name,
          description: venue.description || '',
          address: venue.address || '',
          city: venue.city_name || '',
          type: venue.type || 'Venue',
          imageUrl: venue.gallery_images && venue.gallery_images.length > 0 ? venue.gallery_images[0] : null,
          capacity: {
            min: venue.min_capacity || 0,
            max: venue.max_capacity || 0
          },
          pricing: {
            startingPrice: venue.starting_price || 0,
            currency: venue.currency || 'SAR'
          },
          amenities: venue.amenities || [],
          features: {
            wifi: venue.wifi,
            parking: venue.parking
          }
        }));
      }
    }
    
    // Generate response using OpenAI
    const response = await generateResponse(query, queryIntent, relevantVenues);
    
    return new Response(
      JSON.stringify({
        answer: response,
        venues: relevantVenues.length > 0 ? relevantVenues : undefined,
        suggestedQueries: suggestedQueries
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
      .maybeSingle();
      
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

// Handle voice queries (optimized for speech)
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
      .maybeSingle();
      
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

// Analyze query intent using OpenAI with enhanced parameters
async function analyzeQueryIntent(query: string, enhancedSearch?: any) {
  try {
    // Use the enhanced search info if available
    const searchContext = enhancedSearch ? 
      `Enhanced search info indicates this is likely: 
      - Location query: ${enhancedSearch.isLocationQuery ? 'Yes' : 'No'}
      - Capacity query: ${enhancedSearch.isCapacityQuery ? 'Yes' : 'No'}
      - Pricing query: ${enhancedSearch.isPricingQuery ? 'Yes' : 'No'}
      - Category query: ${enhancedSearch.isCategoryQuery ? 'Yes' : 'No'}` 
      : '';

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
            ${searchContext}
            Return ONLY a JSON object with the following structure:
            {
              "searchVenues": boolean, // true if the user is searching for venues
              "searchParams": {
                "city": string or null, // city name if mentioned
                "category": string or array or null, // category name(s) if mentioned (e.g., wedding, conference, etc.)
                "type": string or null, // venue type if mentioned (e.g., hotel, restaurant, hall, etc.)
                "minCapacity": number or null, // minimum capacity if mentioned
                "maxCapacity": number or null, // maximum capacity if mentioned
                "maxPrice": number or null, // maximum price if mentioned
                "amenities": string[] // array of amenities mentioned (e.g., wifi, parking, etc.)
                "features": string[] // specific features like wifi, parking, etc.
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

// Generate suggested follow-up queries
async function generateSuggestedQueries(query: string, intent: any): Promise<string[]> {
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
            `You are an AI assistant for FindVenue, a venue booking platform.
             Based on the user's query and their intent, suggest 5 follow-up questions they might want to ask.
             Make the suggestions specific, relevant, and natural.
             Return your response as a JSON array of strings.
             Examples: ["Show me wedding venues in Riyadh", "What venues offer catering services?"]`
          },
          {
            role: "user",
            content: `User query: "${query}"\nIntent analysis: ${JSON.stringify(intent)}`
          }
        ],
        temperature: 0.7,
        response_format: { "type": "json_object" }
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    const content = JSON.parse(result.choices[0].message.content);
    return Array.isArray(content.suggestions) ? content.suggestions : [];
  } catch (error) {
    console.error('Error generating suggested queries:', error);
    return [
      "Find venues with WiFi",
      "Show me wedding venues",
      "What are the top-rated venues?",
      "Find venues for 50 guests",
      "Show me venues with parking"
    ];
  }
}

// Generate response based on query and intent
async function generateResponse(query: string, intent: any, venues: any[]) {
  try {
    const hasVenues = venues.length > 0;
    const venueDetails = hasVenues 
      ? venues.map(v => `- ${v.name}: ${v.type} in ${v.city}, capacity ${v.capacity.min}-${v.capacity.max}, from ${v.pricing.currency} ${v.pricing.startingPrice}`).join("\n")
      : "";
    
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
             ${hasVenues ? `I've found ${venues.length} venues that match the query. Details:\n${venueDetails}\nI'll show them alongside your response.` : "I didn't find any venues matching the query."}
             Be specific about the venues found if any. Mention venue names, types, and key features that matched their search.
             Keep your response conversational, helpful, and concise (under 150 words).
             If you're suggesting venues, mention that the user can see them below your message.
             Don't include URLs or complex formatting.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 250
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    
    // Fallback response with more details
    if (venues.length > 0) {
      const venueNames = venues.map(v => v.name).join(', ');
      return `I found ${venues.length} venues that might match what you're looking for: ${venueNames}. You can check them out below.`;
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
             Be specific in your answers. If asked about features or amenities, list the exact ones available.
             If asked about pricing, give the exact figures.
             If asked about capacity, provide the minimum and maximum guest counts.
             If information is not available, politely state so instead of inventing details.
             Keep your response conversational, helpful, and concise (under 150 words).
             Don't include URLs or complex formatting.`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7,
        max_tokens: 250
      }),
    });

    const result = await response.json();
    
    if (!result.choices || !result.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }
    
    return result.choices[0].message.content;
  } catch (error) {
    console.error('Error generating venue response:', error);
    
    // Fallback response with basic venue info
    return `${venueDetails.name} is a ${venueDetails.type} that can accommodate ${venueDetails.capacity}. It's located at ${venueDetails.location} in ${venueDetails.city}. How else can I help you with this venue?`;
  }
}

// Import necessary Supabase client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
