
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    
    // If it's a welcome message, generate a welcome using OpenAI
    if (type === 'welcome') {
      if (!venueInfo) {
        return new Response(
          JSON.stringify({ welcome: "Welcome to the venue assistant. How can I help you?" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY not found in environment variables");
        }
        
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: "You are a helpful venue assistant that helps users learn about venues they are interested in. Keep your responses friendly and concise."
              },
              {
                role: "user",
                content: `Generate a brief welcome message for a venue called ${venueInfo.name}. It's a ${venueInfo.type || 'venue'} that can accommodate ${venueInfo.min_capacity || 0} to ${venueInfo.max_capacity || 'many'} people. Keep it under 40 words.`
              }
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
        });

        const openaiData = await openaiResponse.json();
        console.log("OpenAI welcome response:", openaiData);
        
        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          const welcomeMessage = openaiData.choices[0].message.content.trim();
          return new Response(
            JSON.stringify({ welcome: welcomeMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error("Invalid response from OpenAI API");
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        return new Response(
          JSON.stringify({ welcome: `Welcome to ${venueInfo.name}! How can I assist you today?` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // For chat messages, use OpenAI to generate responses
    if (type === 'chat') {
      if (!venueInfo) {
        return new Response(
          JSON.stringify({ answer: "I'm sorry, I couldn't find information about this venue." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          throw new Error("OPENAI_API_KEY not found in environment variables");
        }
        
        // Format venue info for the prompt
        const formatPrice = (price) => {
          return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 'Not specified';
        };
        
        const venueDetails = {
          name: venueInfo.name,
          type: venueInfo.type || 'Not specified',
          description: venueInfo.description || 'Not available',
          address: venueInfo.address || 'Not specified',
          city: venueInfo.city_name || 'Not specified',
          capacity: `${venueInfo.min_capacity || 'Not specified'} to ${venueInfo.max_capacity || 'Not specified'} guests`,
          pricing: {
            startingPrice: `${venueInfo.currency || 'SAR'} ${formatPrice(venueInfo.starting_price)}`,
            pricePerPerson: venueInfo.price_per_person ? `${venueInfo.currency || 'SAR'} ${formatPrice(venueInfo.price_per_person)}` : null,
            hourlyRate: venueInfo.hourly_rate ? `${venueInfo.currency || 'SAR'} ${formatPrice(venueInfo.hourly_rate)}` : null,
          },
          amenities: venueInfo.amenities || [],
          wifi: venueInfo.wifi ? "Available" : "Not available",
          parking: venueInfo.parking ? "Available" : "Not available",
          availability: venueInfo.availability || [],
          contactInfo: venueInfo.owner_info ? `${venueInfo.owner_info.name || 'Venue host'} (Response time: ${venueInfo.owner_info.responseTime || 'Not specified'})` : "Contact the venue host through the booking form",
          categories: venueInfo.category_name || []
        };
        
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
                content: `You are a helpful venue assistant for ${venueInfo.name}. 
                You know all the details about this venue and provide accurate information.
                Be concise and helpful. Keep responses under 100 words. 
                Here are the venue details:
                ${JSON.stringify(venueDetails, null, 2)}`
              },
              {
                role: "user",
                content: query
              }
            ],
            temperature: 0.7,
            max_tokens: 300,
          }),
        });

        const openaiData = await openaiResponse.json();
        console.log("OpenAI chat response:", openaiData);
        
        if (openaiData.choices && openaiData.choices[0]?.message?.content) {
          const answer = openaiData.choices[0].message.content.trim();
          return new Response(
            JSON.stringify({ answer }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error("Invalid response from OpenAI API");
        }
      } catch (error) {
        console.error("OpenAI API error:", error);
        
        // Fallback to the original rule-based responses if OpenAI fails
        let answer = "";
        const queryLower = query.toLowerCase();
        
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
        
        return new Response(
          JSON.stringify({ answer }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return a generic response for other request types
    return new Response(
      JSON.stringify({ answer: "I'm here to help you with venue information. How can I assist you today?" }),
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
