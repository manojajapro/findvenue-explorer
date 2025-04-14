
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

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
    console.log(`Received ${type} request for venue ${venueId}: ${query}`);
    
    // Basic validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch venue data if venueId is provided
    let venueInfo = null;
    if (venueId) {
      const { data, error } = await supabaseClient
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();
        
      if (error) {
        console.error('Error fetching venue data:', error);
      } else {
        venueInfo = data;
        console.log('Fetched venue info:', venueInfo.name);
      }
    }
    
    // Generate a response based on the query and venue data
    let answer = "";
    const queryLower = query.toLowerCase();
    
    if (!venueInfo) {
      answer = "I'm sorry, I couldn't find information for this venue. Please try again later.";
    } else {
      // Format prices with commas for readability
      const formatPrice = (price) => {
        return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 'Not specified';
      };
      
      const startingPrice = formatPrice(venueInfo.starting_price);
      const pricePerPerson = venueInfo.price_per_person ? formatPrice(venueInfo.price_per_person) : null;
      const hourlyRate = venueInfo.hourly_rate ? formatPrice(venueInfo.hourly_rate) : null;
      
      if (queryLower.includes("price") || queryLower.includes("cost") || queryLower.includes("fee")) {
        answer = `${venueInfo.name} pricing starts at ${venueInfo.currency || 'SAR'} ${startingPrice}.`;
        if (pricePerPerson) {
          answer += ` There's also a price per person of ${venueInfo.currency || 'SAR'} ${pricePerPerson}.`;
        }
        if (hourlyRate) {
          answer += ` Hourly rate is ${venueInfo.currency || 'SAR'} ${hourlyRate}.`;
        }
      } 
      else if (queryLower.includes("capacity") || queryLower.includes("guests") || queryLower.includes("people")) {
        answer = `${venueInfo.name} can accommodate between ${venueInfo.min_capacity || 'Not specified'} and ${venueInfo.max_capacity || 'Not specified'} guests.`;
      } 
      else if (queryLower.includes("amenities") || queryLower.includes("facilities") || queryLower.includes("features")) {
        const amenitiesList = venueInfo.amenities && venueInfo.amenities.length > 0 
          ? venueInfo.amenities.join(', ') 
          : 'No specific amenities listed';
        answer = `${venueInfo.name} offers these amenities: ${amenitiesList}.`;
        if (venueInfo.wifi) answer += " WiFi is available.";
        if (venueInfo.parking) answer += " Parking facilities are available.";
      } 
      else if (queryLower.includes("location") || queryLower.includes("address") || queryLower.includes("where")) {
        answer = `${venueInfo.name} is located at ${venueInfo.address || 'Address not specified'} in ${venueInfo.city_name || 'the city'}.`;
        if (venueInfo.latitude && venueInfo.longitude) {
          answer += " You can find it on the map on this page.";
        }
      } 
      else if (queryLower.includes("book") || queryLower.includes("reserve") || queryLower.includes("availability")) {
        const availabilityDays = venueInfo.availability && venueInfo.availability.length > 0 
          ? venueInfo.availability.join(', ') 
          : 'Contact venue for availability';
        answer = `To book ${venueInfo.name}, you can use the booking form on this page. Available days include: ${availabilityDays}. You can also message the venue host directly.`;
      } 
      else if (queryLower.includes("contact") || queryLower.includes("owner") || queryLower.includes("host")) {
        answer = `You can contact the venue host directly by clicking the "Message Venue Host" button on this page. They'll respond to your inquiries about ${venueInfo.name}.`;
      } 
      else if (queryLower.includes("type") || queryLower.includes("category") || queryLower.includes("kind")) {
        const venueType = venueInfo.type || 'No specific type';
        const categoryNames = venueInfo.category_name && venueInfo.category_name.length > 0 
          ? venueInfo.category_name.join(', ') 
          : 'No specific category';
        answer = `${venueInfo.name} is a ${venueType} venue in the ${categoryNames} category.`;
      }
      else if (queryLower.includes("rules") || queryLower.includes("policy") || queryLower.includes("regulations")) {
        if (venueInfo.rules_and_regulations && Object.keys(venueInfo.rules_and_regulations).length > 0) {
          answer = `${venueInfo.name} has specific rules and regulations that you should be aware of. Please check the rules section on this page for details.`;
        } else {
          answer = `For rules and regulations regarding ${venueInfo.name}, please contact the venue host directly.`;
        }
      }
      else {
        // General information response
        answer = `${venueInfo.name} is a ${venueInfo.type || ''} venue located in ${venueInfo.city_name || 'the city'}. `;
        answer += `It can accommodate between ${venueInfo.min_capacity || 'Not specified'} and ${venueInfo.max_capacity || 'Not specified'} guests. `;
        answer += `Pricing starts at ${venueInfo.currency || 'SAR'} ${startingPrice}. `;
        answer += `You can ask me about specific details like amenities, location, booking information, and more!`;
      }
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
});
