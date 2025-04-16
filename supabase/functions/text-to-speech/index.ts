
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use the provided ElevenLabs API key directly
const ELEVEN_LABS_API_KEY = "sk_fe796be98a194c7eb3bf5a3e5cc089835f08bb09a80cfeb1";

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

    // Use a default voice ID if none provided
    const voice = voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
    
    console.log(`Converting text to speech using voice ${voice}`);
    
    // Using Eleven Labs API for high-quality TTS
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.1,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('ElevenLabs API error:', error);
      throw new Error(`ElevenLabs API error: ${error.detail?.message || response.statusText}`);
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
  } catch (error) {
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
