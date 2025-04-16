import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to create a standard response
const createResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  );
};

// Handler for error responses
const handleError = (error: Error, status = 500) => {
  console.error('Error in venue-assistant:', error);
  return createResponse({ 
    error: error.message || "An unexpected error occurred" 
  }, status);
};

// Fetch venue data from Supabase
async function fetchVenueData(supabaseClient: any, venueId?: string) {
  try {
    if (venueId) {
      // Fetch specific venue
      const { data, error } = await supabaseClient
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();
        
      if (error) throw error;
      return data;
    } else {
      // Fetch all venues (with limit)
      const { data, error } = await supabaseClient
        .from('venues')
        .select('*')
        .limit(100);
        
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error fetching venue data:', error);
    throw new Error('Failed to fetch venue data');
  }
}

// Format venue data for NLP context
function formatVenueData(venueData: any) {
  if (!venueData) return '';
  
  // Format a single venue
  if (!Array.isArray(venueData)) {
    const venue = venueData;
    return {
      id: venue.id,
      name: venue.name || 'Unnamed venue',
      type: venue.type || 'Not specified',
      description: venue.description || 'No description available',
      address: venue.address || 'Address not specified',
      city: venue.city_name || 'City not specified',
      capacity: {
        min: venue.min_capacity || 'Not specified',
        max: venue.max_capacity || 'Not specified'
      },
      pricing: {
        startingPrice: venue.starting_price ? `${venue.currency || 'SAR'} ${venue.starting_price}` : 'Not specified',
        pricePerPerson: venue.price_per_person ? `${venue.currency || 'SAR'} ${venue.price_per_person}` : null
      },
      amenities: venue.amenities || [],
      features: {
        wifi: venue.wifi ? "Available" : "Not available",
        parking: venue.parking ? "Available" : "Not available"
      },
      availability: venue.availability || [],
      category: venue.category_name || []
    };
  }
  
  // Format multiple venues (simplified for context)
  return venueData.map((venue: any) => ({
    id: venue.id,
    name: venue.name || 'Unnamed venue',
    type: venue.type || 'Not specified',
    city: venue.city_name || 'Unknown location',
    rating: venue.rating || 'No ratings',
    startingPrice: venue.starting_price ? `${venue.currency || 'SAR'} ${venue.starting_price}` : 'Not specified',
    capacity: {
      min: venue.min_capacity || 'Not specified',
      max: venue.max_capacity || 'Not specified'
    }
  }));
}

// Search for venues that match a query
async function searchVenues(supabaseClient: any, query: string) {
  try {
    // Parse the query for keywords
    const queryLower = query.toLowerCase();
    let cityFilter = null;
    let typeFilter = null;
    let capacityMin = null;
    let capacityMax = null;
    
    // Extract city name (simple extraction, can be enhanced)
    const cities = ['riyadh', 'jeddah', 'dammam', 'mecca', 'medina'];
    for (const city of cities) {
      if (queryLower.includes(city)) {
        cityFilter = city;
        break;
      }
    }
    
    // Extract venue type
    const venueTypes = ['wedding', 'conference', 'meeting', 'party', 'corporate', 'exhibition'];
    for (const type of venueTypes) {
      if (queryLower.includes(type)) {
        typeFilter = type;
        break;
      }
    }
    
    // Extract capacity (very simple approach)
    const capacityMatch = query.match(/(\d+)\s*(people|guests|persons|capacity)/i);
    if (capacityMatch) {
      const capacity = parseInt(capacityMatch[1]);
      if (!isNaN(capacity)) {
        capacityMin = capacity;
      }
    }
    
    // Build the query
    let venueQuery = supabaseClient
      .from('venues')
      .select('*')
      .limit(5);
    
    if (cityFilter) {
      venueQuery = venueQuery.ilike('city_name', `%${cityFilter}%`);
    }
    
    if (typeFilter) {
      venueQuery = venueQuery.ilike('type', `%${typeFilter}%`);
    }
    
    if (capacityMin) {
      venueQuery = venueQuery.gte('max_capacity', capacityMin);
    }
    
    // Execute the query
    const { data, error } = await venueQuery;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching venues:', error);
    return [];
  }
}

// Call OpenAI to process the query
async function callOpenAI(query: string, venueInfo: any, openAIApiKey: string) {
  try {
    // Format the system message based on available venue data
    let systemMessage = "You are a helpful assistant for FindVenue, a platform for finding and booking event venues. ";
    
    if (venueInfo) {
      if (Array.isArray(venueInfo)) {
        systemMessage += `You know details about ${venueInfo.length} venues in our system. `;
        systemMessage += "Provide helpful answers about venues, suggest specific venues when relevant, and help users find the right venue for their needs. ";
      } else {
        systemMessage += `You are specifically knowledgeable about ${venueInfo.name}, a venue in our system. `;
        systemMessage += "Provide detailed information about this venue when asked. ";
      }
      systemMessage += "When relevant, include venue IDs in your response so they can be linked to venue pages.";
    } else {
      systemMessage += "Help users find the right venue for their events. ";
      systemMessage += "Provide general information about venue types, planning events, and best practices.";
    }
    
    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: query }
    ];
    
    if (venueInfo) {
      messages.splice(1, 0, { 
        role: "system", 
        content: `Here is the venue data to reference: ${JSON.stringify(venueInfo)}` 
      });
    }
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error("Failed to generate a response from AI assistant");
  }
}

// Process a welcome message for voice assistant
async function handleWelcomeRequest(supabaseClient: any, venueId: string | undefined, openAIApiKey: string) {
  try {
    let welcomeMessage = "Hello! I'm your venue assistant. How can I help you today?";
    
    // If venue ID is provided, customize welcome message
    if (venueId) {
      const venueData = await fetchVenueData(supabaseClient, venueId);
      if (venueData) {
        welcomeMessage = `Welcome to ${venueData.name}! I'm your virtual assistant and can answer questions about this venue's pricing, capacity, amenities, and booking information. How can I help you?`;
      }
    }
    
    return {
      welcome: welcomeMessage
    };
  } catch (error) {
    console.error("Error in welcome request:", error);
    throw error;
  }
}

// Process a chat request
async function handleChatRequest(supabaseClient: any, query: string, openAIApiKey: string) {
  try {
    // Search for relevant venues based on the query
    const matchingVenues = await searchVenues(supabaseClient, query);
    
    // Format venue data for the AI
    const formattedVenues = formatVenueData(matchingVenues);
    
    // Get AI response
    const answer = await callOpenAI(query, formattedVenues, openAIApiKey);
    
    // Return both the AI answer and the matching venues
    return {
      answer,
      venues: matchingVenues.length > 0 ? matchingVenues : null
    };
  } catch (error) {
    console.error("Error in chat request:", error);
    throw error;
  }
}

// Process a venue-specific request
async function handleVenueRequest(supabaseClient: any, query: string, venueId: string, openAIApiKey: string) {
  try {
    // Get the specific venue data
    const venueData = await fetchVenueData(supabaseClient, venueId);
    
    if (!venueData) {
      throw new Error(`Venue with ID ${venueId} not found`);
    }
    
    // Format venue data for the AI
    const formattedVenue = formatVenueData(venueData);
    
    // Get AI response
    const answer = await callOpenAI(query, formattedVenue, openAIApiKey);
    
    return {
      answer,
      venue: venueData
    };
  } catch (error) {
    console.error("Error in venue request:", error);
    throw error;
  }
}

// Process a voice request
async function handleVoiceRequest(supabaseClient: any, query: string, venueId: string | undefined, openAIApiKey: string) {
  try {
    // If venue ID is provided, handle venue-specific request
    if (venueId) {
      const result = await handleVenueRequest(supabaseClient, query, venueId, openAIApiKey);
      return result;
    } else {
      // Otherwise, handle general chat request
      const result = await handleChatRequest(supabaseClient, query, openAIApiKey);
      return result;
    }
  } catch (error) {
    console.error("Error in voice request:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
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

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return handleError(new Error("OpenAI API key not found in environment variables"), 500);
    }

    // Parse the request body
    const body = await req.json();
    const { query, venueId, type } = body;

    // Log the incoming request for debugging
    console.log(`Received ${type} request ${venueId ? `for venue ${venueId}` : ''}: ${query}`);
    
    // Basic validation
    if (!query && type !== 'welcome') {
      return handleError(new Error('Invalid query parameter'), 400);
    }

    // Route to appropriate handler based on request type
    let result;
    switch(type) {
      case 'welcome':
        result = await handleWelcomeRequest(supabaseClient, venueId, openAIApiKey);
        break;
      case 'venue':
        if (!venueId) {
          return handleError(new Error('Venue ID is required for venue-specific queries'), 400);
        }
        result = await handleVenueRequest(supabaseClient, query, venueId, openAIApiKey);
        break;
      case 'voice':
        result = await handleVoiceRequest(supabaseClient, query, venueId, openAIApiKey);
        break;
      case 'chat':
      default:
        result = await handleChatRequest(supabaseClient, query, openAIApiKey);
        break;
    }

    return createResponse(result);
  } catch (error: any) {
    return handleError(error);
  }
});
