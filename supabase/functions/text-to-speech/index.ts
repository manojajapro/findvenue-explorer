
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAI API key from environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found in environment variables');
    }

    const { text, voice = 'alloy' } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Converting to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Using OpenAI's TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI TTS API error:', errorData);
      throw new Error(`OpenAI TTS API error: ${JSON.stringify(errorData)}`);
    }

    // Get audio data
    const audioData = await response.arrayBuffer();
    
    // Convert audio data to base64
    const uint8Array = new Uint8Array(audioData);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binaryString);

    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: 'mp3'
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  } catch (error: any) {
    console.error('Error in text-to-speech function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to convert text to speech' 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
