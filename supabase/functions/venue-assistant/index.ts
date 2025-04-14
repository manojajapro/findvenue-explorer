
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const requestData = await req.json();
    const { query, venueId, type = 'chat' } = requestData;

    console.log(`Processing query: "${query}" for venue ID: ${venueId}`);

    // Fetch data for the specific venue
    if (!venueId) {
      throw new Error('Venue ID is required');
    }

    console.log(`Fetching data for specific venue ID: ${venueId}`);

    // Get venue details from the database
    const { data: venue, error } = await supabaseClient
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) {
      throw new Error(`Error fetching venue data: ${error.message}`);
    }

    console.log("Venue data retrieved: success");

    // Format the venue details for the AI to use
    const venueDetails = {
      name: venue.name,
      description: venue.description,
      location: venue.address,
      city: venue.city_name,
      categoryType: venue.category_name,
      capacity: {
        min: venue.min_capacity,
        max: venue.max_capacity
      },
      pricing: {
        currency: venue.currency,
        startingPrice: venue.starting_price,
        pricePerPerson: venue.price_per_person
      },
      amenities: venue.amenities,
      availability: venue.availability,
      type: venue.type,
      rules: venue.rules_and_regulations,
      openingHours: venue.opening_hours
    };

    // Generate a system prompt that includes venue details
    const systemPrompt = `You are an AI assistant named "Venue Assistant" for the venue "${venueDetails.name}". 
    Your role is to help potential customers by answering their questions about this specific venue.
    Here are the venue details:
    - Name: ${venueDetails.name}
    - Description: ${venueDetails.description}
    - Location: ${venueDetails.location}, ${venueDetails.city}
    - Category: ${Array.isArray(venueDetails.categoryType) ? venueDetails.categoryType.join(', ') : venueDetails.categoryType}
    - Capacity: ${venueDetails.capacity.min} to ${venueDetails.capacity.max} people
    - Pricing: Starts at ${venueDetails.pricing.currency} ${venueDetails.pricing.startingPrice}
    - Price per Person: ${venueDetails.pricing.pricePerPerson ? `${venueDetails.pricing.currency} ${venueDetails.pricing.pricePerPerson}` : 'Not applicable'}
    - Amenities: ${venueDetails.amenities ? venueDetails.amenities.join(', ') : 'Not specified'}
    - Availability: ${venueDetails.availability ? venueDetails.availability.join(', ') : 'Contact venue for availability'}
    - Venue Type: ${venueDetails.type || 'Standard venue'}

    Be friendly, concise, and helpful. If you don't know something specific, suggest they contact the venue directly for the most accurate information. Always stay on topic about this venue.`;
    
    let answer = "";
    
    if (type === 'welcome') {
      answer = `Hello! I'm the virtual assistant for ${venueDetails.name}. I can help answer any questions you might have about our venue, from pricing and capacity to amenities and booking options. What would you like to know?`;
      return new Response(JSON.stringify({ welcome: answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("System prompt prepared, calling OpenAI...");
    
    // For demo purposes, create a simple response without OpenAI
    if (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost')) {
      answer = `${venueDetails.name} pricing starts at ${venueDetails.pricing.currency} ${venueDetails.pricing.startingPrice}. ${venueDetails.pricing.pricePerPerson ? `There's also a price per person of ${venueDetails.pricing.currency} ${venueDetails.pricing.pricePerPerson}.` : ''}`;
    } else if (query.toLowerCase().includes('capacity') || query.toLowerCase().includes('people')) {
      answer = `${venueDetails.name} can accommodate between ${venueDetails.capacity.min} and ${venueDetails.capacity.max} guests.`;
    } else if (query.toLowerCase().includes('location') || query.toLowerCase().includes('address')) {
      answer = `${venueDetails.name} is located at ${venueDetails.location} in ${venueDetails.city}.`;
    } else if (query.toLowerCase().includes('amenities') || query.toLowerCase().includes('facilities')) {
      const amenitiesList = Array.isArray(venueDetails.amenities) ? venueDetails.amenities.join(', ') : 'None specified';
      answer = `${venueDetails.name} offers these amenities: ${amenitiesList}.`;
    } else if (query.toLowerCase().includes('book') || query.toLowerCase().includes('reserve')) {
      answer = `To book ${venueDetails.name}, you can use the booking form on this page or message the venue host directly.`;
    } else if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
      answer = `Hello! I'm the virtual assistant for ${venueDetails.name}. How can I help you today?`;
    } else {
      answer = `Thank you for your interest in ${venueDetails.name}. ${venueDetails.name} is a ${venueDetails.type || "venue"} located in ${venueDetails.city} with capacity for ${venueDetails.capacity.min} to ${venueDetails.capacity.max} people. How else can I help you?`;
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in venue-assistant function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
