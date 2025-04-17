
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FreeTTS API endpoint - free and open source TTS service
const FREE_TTS_ENDPOINT = "https://api.freetts.com/speech";
const FREE_TTS_API_KEY = Deno.env.get("FREE_TTS_API_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Converting text to speech using FreeTTS`);
    
    // Default voice settings - can be expanded with more options
    const voice = voiceId || 'en-us-1'; // Default English US voice
    
    // Using the FreeTTS API to convert text to speech
    const response = await fetch(FREE_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FREE_TTS_API_KEY}`,
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
        // Additional options like speed, pitch can be added here
      }),
    });

    if (!response.ok) {
      // Fallback to browser's Web Speech API method
      // We'll return instructions to use the browser's SpeechSynthesis API
      return new Response(
        JSON.stringify({ 
          useWebSpeech: true,
          text: text,
          voice: voice,
          format: 'webspeech'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get response with base64 encoded audio
    const data = await response.json();
    const base64Audio = data.audio || ''; // Get the base64 audio string

    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: 'mp3'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    
    // Return fallback to use browser's Web Speech API
    return new Response(
      JSON.stringify({ 
        useWebSpeech: true,
        error: error.message || 'Failed to convert text to speech',
        fallback: 'Using browser speech synthesis instead'
      }),
      {
        status: 200, // Still return 200 as we provide a fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
