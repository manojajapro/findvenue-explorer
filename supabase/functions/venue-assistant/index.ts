
// Venue Assistant Function: Enhanced to search all attributes and provide pro answers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const allVenueColumns = [
  "id", "name", "description", "gallery_images", "address", "city_id", "city_name",
  "category_id", "category_name", "min_capacity", "max_capacity", "currency",
  "starting_price", "price_per_person", "amenities", "availability", "rating",
  "reviews_count", "featured", "popular", "created_at", "updated_at", "latitude",
  "longitude", "parking", "wifi", "accessibility_features", "accepted_payment_methods",
  "opening_hours", "owner_info", "additional_services", "rules_and_regulations",
  "type", "zipcode", "image_url", "status"
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { query, type = 'search' } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const keywords = query.trim().toLowerCase().split(/\s+/);
    // Build filters for matching keywords in text columns
    let textFilters = [];
    
    for (const keyword of keywords) {
      // Skip very short keywords to prevent too many false positives
      if (keyword.length < 2) continue;
      
      // Use ilike for text columns
      textFilters.push(`name.ilike.%${keyword}%`);
      textFilters.push(`description.ilike.%${keyword}%`);
      textFilters.push(`address.ilike.%${keyword}%`);
      textFilters.push(`city_name.ilike.%${keyword}%`);
      textFilters.push(`category_name.ilike.%${keyword}%`);
      
      // For numeric columns, only add if keyword is a number
      if (!isNaN(Number(keyword))) {
        textFilters.push(`min_capacity.eq.${keyword}`);
        textFilters.push(`max_capacity.eq.${keyword}`);
        textFilters.push(`starting_price.eq.${keyword}`);
        textFilters.push(`zipcode.eq.${keyword}`);
      }
    }
    
    // Now execute the query with the text filters
    let venueQuery = supabaseClient
      .from('venues')
      .select('*')
      .or(textFilters.join(','))
      .order('rating', { ascending: false })
      .limit(10);

    const { data: venues, error } = await venueQuery;

    if (error) {
      console.error('Venue search error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to search venues' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "I couldn't find any venues matching your criteria. Try using different keywords or fewer filters.",
          venues: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assemble a "pro" answer referencing all matching attributes
    let proAnswer = `I found ${venues.length} venue${venues.length > 1 ? "s" : ""} based on your keywords. Here are the top results:\n\n`;
    
    // For each venue, display all attributes that match the keywords
    venues.forEach((venue, idx) => {
      proAnswer += `${idx + 1}. ${venue.name || "No name"}\n`;
      proAnswer += `   • City: ${venue.city_name || "Unknown location"}\n`;
      proAnswer += `   • Category: ${venue.category_name || "General venue"}\n`;
      if (venue.description) {
        proAnswer += `   • Description: ${venue.description.substring(0, 100)}${venue.description.length > 100 ? '...' : ''}\n`;
      }
      if (venue.min_capacity && venue.max_capacity) {
        proAnswer += `   • Capacity: ${venue.min_capacity} - ${venue.max_capacity} guests\n`;
      }
      if (venue.starting_price) {
        proAnswer += `   • Starting price: ${venue.currency || 'SAR'} ${venue.starting_price}\n`;
      }
      if (venue.rating) {
        proAnswer += `   • Rating: ${venue.rating}/5 (${venue.reviews_count || 0} reviews)\n`;
      }
      proAnswer += `   • Status: ${venue.status || "Unknown"}\n`;
      if (venue.image_url) {
        proAnswer += `   • [View Image](${venue.image_url})\n`;
      }
      proAnswer += "\n";
    });
    
    proAnswer += "Would you like more details about any venue? You can ask for that venue by name or id.\n";

    return new Response(
      JSON.stringify({
        answer: proAnswer,
        venues: venues
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Venue Assistant Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
