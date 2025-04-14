
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const body = await req.json();
    const { query, venueId, type } = body;

    // Log the incoming request for debugging
    console.log(`Received ${type} request for venue ${venueId}: ${query}`);
    
    // Basic validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // In a real implementation, you would fetch venue info from your database using venueId
    // For now, we'll use mock data
    const venueInfo = {
      name: "Sample Venue",
      location: "Riyadh",
      capacity: "200 guests",
      amenities: ["WiFi", "Parking", "Catering"],
      priceRange: "15,000 - 25,000 SAR"
    }
    
    // Generate a response based on the query
    // This is a simple rule-based approach; in production you might use a real AI service
    let answer = "";
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes("price") || queryLower.includes("cost")) {
      answer = `The price range for this venue is ${venueInfo.priceRange}.`;
    } 
    else if (queryLower.includes("capacity") || queryLower.includes("guests") || queryLower.includes("people")) {
      answer = `This venue can accommodate up to ${venueInfo.capacity}.`;
    } 
    else if (queryLower.includes("amenities") || queryLower.includes("facilities") || queryLower.includes("services")) {
      answer = `This venue offers the following amenities: ${venueInfo.amenities.join(", ")}.`;
    } 
    else if (queryLower.includes("location") || queryLower.includes("where")) {
      answer = `This venue is located in ${venueInfo.location}.`;
    } 
    else if (queryLower.includes("book") || queryLower.includes("reservation") || queryLower.includes("reserve")) {
      answer = `To book this venue, please fill out the booking form on this page or contact the venue owner directly.`;
    } 
    else if (queryLower.includes("hello") || queryLower.includes("hi") || queryLower.includes("greetings")) {
      answer = `Hello! I'm the venue assistant for ${venueInfo.name}. How can I help you today?`;
    } 
    else {
      answer = `I'm the venue assistant for ${venueInfo.name}. You can ask me about pricing, capacity, amenities, location, or how to book this venue.`;
    }

    // Return the response
    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error processing venue assistant request:", error);
    
    return new Response(
      JSON.stringify({ error: "Failed to process your request", message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
