
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
    // Build complex "or" filter to match any keyword in any attribute
    let orFilters: string[] = [];
    for (const keyword of keywords) {
      // Numeric: try to match on min/max capacity, price, rating, zipcode etc
      for (const column of allVenueColumns) {
        // Choose string or array search
        if (column === 'min_capacity' || column === 'max_capacity' ||
            column === 'starting_price' || column === 'price_per_person' ||
            column === 'rating' || column === 'reviews_count' ||
            column === 'latitude' || column === 'longitude' ||
            column === 'zipcode') {
          // Numeric: try exact or ilike
          if (!isNaN(Number(keyword))) {
            orFilters.push(`${column}.eq.${keyword}`);
          }
        } else if (
          column === 'amenities' || column === 'gallery_images' ||
          column === 'category_name' || column === 'accepted_payment_methods' ||
          column === 'accessibility_features' || column === 'additional_services'
        ) {
          // Array columns: cs (contains) for strings
          orFilters.push(`${column}.cs.{${keyword}}`);
        } else if (
          column === 'featured' || column === 'popular' ||
          column === 'wifi' || column === 'parking'
        ) {
          // Boolean: catch true if keywords match
          if (
            (column === "featured" && ["featured", "premium"].includes(keyword)) ||
            (column === "popular" && ["popular", "famous"].includes(keyword)) ||
            (column === "wifi" && ["wifi", "internet"].includes(keyword)) ||
            (column === "parking" && ["parking"].includes(keyword))
          ) {
            orFilters.push(`${column}.eq.true`);
          }
        } else {
          // Default string, ilike
          const safeKeyword = keyword.replace(/"/g, "");
          orFilters.push(`${column}.ilike.%${safeKeyword}%`);
        }
      }
    }

    let venueQuery = supabaseClient.from('venues').select('*');

    if (orFilters.length > 0) {
      venueQuery = venueQuery.or(orFilters.join(','));
    }

    // Sort by rating and popularity
    venueQuery = venueQuery.order('rating', { ascending: false }).order('popular', { ascending: false }).limit(10);

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
      for (const key of allVenueColumns) {
        const val = venue[key];
        // For each keyword, if it occurs in this value (case-insensitive, stringified for arrays/objects), show that line:
        if (val !== null && val !== undefined) {
          const valueString = Array.isArray(val) ? val.join(", ") : String(val);
          for (const keyword of keywords) {
            if (valueString.toLowerCase().includes(keyword)) {
              proAnswer += `   • ${key.replace(/_/g, " ")}: ${valueString}\n`;
              break;
            }
          }
        }
      }
      proAnswer += `   • Venue Status: ${venue.status || "Unknown"}\n`;
      if (venue.image_url) {
        proAnswer += `   • [View Image](${venue.image_url})\n`;
      }
      proAnswer += "\n";
    });
    proAnswer += "Would you like more details about any venue? You can ask for that venue by name or id.\n";

    const formattedVenues = venues.map(v =>
      Object.fromEntries(allVenueColumns.map(col => [col, v[col]]))
    );

    return new Response(
      JSON.stringify({
        answer: proAnswer,
        venues: formattedVenues
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
