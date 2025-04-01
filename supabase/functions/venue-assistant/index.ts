
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, venueId, type } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://esdmelfzeszjtbnoajig.supabase.co';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZG1lbGZ6ZXN6anRibm9hamlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4ODUwMTUsImV4cCI6MjA1ODQ2MTAxNX0.1z27OZ04RuR8AYlVGaE9L8vWWYilSrMlyq422BJcX94';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log(`Processing query: "${query}" for venue ID: ${venueId || 'N/A'}`);
    
    // Fetch venue data
    let venueData = null;
    let allVenueData = null;
    
    if (venueId) {
      // Fetch specific venue data if venueId is provided
      console.log(`Fetching data for specific venue ID: ${venueId}`);
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();
        
      if (error) {
        console.error('Error fetching venue data:', error);
        throw error;
      }
      
      console.log('Venue data retrieved:', data ? 'success' : 'no data');
      venueData = data;
    } else {
      // Fetch all venues for general queries
      console.log('Fetching data for all venues');
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .limit(50);
        
      if (error) {
        console.error('Error fetching all venues:', error);
        throw error;
      }
      
      console.log(`Retrieved ${data?.length || 0} venues`);
      allVenueData = data;
    }
    
    // Prepare system prompt
    let systemPrompt = "You are a knowledgeable venue assistant that provides accurate information about venues based on the available data. ";
    
    if (venueData) {
      // For specific venue queries
      systemPrompt += `You have detailed information about ${venueData.name}:\n`;
      systemPrompt += `Description: ${venueData.description || 'No description available'}\n`;
      systemPrompt += `Location: ${venueData.address || 'Unknown'}, ${venueData.city_name || 'Unknown'}\n`;
      systemPrompt += `Category: ${venueData.category_name || 'Unknown'}\n`;
      systemPrompt += `Capacity: ${venueData.min_capacity || 0} to ${venueData.max_capacity || 0} guests\n`;
      systemPrompt += `Price: Starting from ${venueData.currency || 'SAR'} ${venueData.starting_price || 0}\n`;
      systemPrompt += `Amenities: ${venueData.amenities?.join(', ') || 'None listed'}\n`;
      systemPrompt += `WiFi: ${venueData.wifi ? 'Available' : 'Not available'}\n`;
      systemPrompt += `Parking: ${venueData.parking ? 'Available' : 'Not available'}\n`;
      systemPrompt += `Rating: ${venueData.rating || 0} stars from ${venueData.reviews_count || 0} reviews\n`;
      
      // Additional venue information
      if (venueData.opening_hours) {
        systemPrompt += `Opening Hours: ${JSON.stringify(venueData.opening_hours)}\n`;
      }
      
      if (venueData.additional_services && venueData.additional_services.length > 0) {
        systemPrompt += `Additional Services: ${venueData.additional_services.join(', ')}\n`;
      }
      
      if (venueData.accepted_payment_methods && venueData.accepted_payment_methods.length > 0) {
        systemPrompt += `Payment Methods: ${venueData.accepted_payment_methods.join(', ')}\n`;
      }
      
      // Owner information if available
      if (venueData.owner_info) {
        systemPrompt += `Contact: The venue is managed by ${venueData.owner_info.name || 'the owner'}\n`;
        if (venueData.owner_info.response_time) {
          systemPrompt += `Response Time: Typically responds within ${venueData.owner_info.response_time}\n`;
        }
      }
      
      // Availability information
      if (venueData.availability && venueData.availability.length > 0) {
        systemPrompt += `Available on: ${venueData.availability.join(', ')}\n`;
      }
      
      // Instructions for the AI
      systemPrompt += "\nPlease answer any questions about this venue specifically. Be friendly, professional and informative. If asked about booking, direct users to the booking form on the venue page. If asked about something not in the data, politely say you don't have that information yet but can help with other inquiries about the venue.";
    } else if (allVenueData) {
      // For general venue queries
      systemPrompt += "You have information about multiple venues. Please provide concise answers based on the venue database. ";
      
      // Include general venue categories and cities
      const categories = [...new Set(allVenueData.map(v => v.category_name).filter(Boolean))];
      const cities = [...new Set(allVenueData.map(v => v.city_name).filter(Boolean))];
      
      systemPrompt += `Available venue categories include: ${categories.join(', ')}. `;
      systemPrompt += `Venues are available in these cities: ${cities.join(', ')}. `;
      
      // Add price range information
      const prices = allVenueData
        .filter(v => v.starting_price)
        .map(v => v.starting_price);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        systemPrompt += `Venues range in price from ${minPrice} to ${maxPrice} SAR. `;
      }
      
      // Add capacity information
      const capacities = allVenueData
        .filter(v => v.max_capacity)
        .map(v => v.max_capacity);
      
      if (capacities.length > 0) {
        const minCapacity = Math.min(...capacities);
        const maxCapacity = Math.max(...capacities);
        systemPrompt += `Venues can accommodate from ${minCapacity} to ${maxCapacity} guests. `;
      }
      
      // Add specific instructions
      systemPrompt += "If asked about venues in a specific city or category, provide information about available options. ";
      systemPrompt += "If asked about specific details of a venue that isn't explicitly mentioned in your data, suggest that the user view that specific venue page for more information.";
      
      // Add example venues
      const featuredVenues = allVenueData.filter(v => v.featured).slice(0, 5);
      if (featuredVenues.length > 0) {
        systemPrompt += "\n\nFeatured venues include: \n";
        featuredVenues.forEach(venue => {
          systemPrompt += `- ${venue.name} (${venue.category_name || 'Various events'}) in ${venue.city_name || 'Unknown location'}, capacity up to ${venue.max_capacity || 'unknown'} guests\n`;
        });
      }
    }
    
    console.log('System prompt prepared, calling OpenAI...');
    
    // Call OpenAI API
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const answer = data.choices[0].message.content;
    
    console.log(`Generated answer for query: "${query.substring(0, 30)}..."`);
    
    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in venue-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
