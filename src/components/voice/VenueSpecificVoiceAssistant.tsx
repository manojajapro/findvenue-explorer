
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';

const VenueSpecificVoiceAssistant = () => {
  const {
    isListening,
    transcript,
    response,
    isProcessing,
    error,
    startListening,
    stopListening,
    venue,
    isLoadingVenue
  } = useVenueVoiceAssistant();

  return (
    <Card className="glass-card border-white/10 w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center">
          <Mic className="w-5 h-5 mr-2 text-findvenue" />
          {venue ? `Ask about ${venue.name}` : 'Voice Assistant'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-2 space-y-4">
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {!venue && !isLoadingVenue ? (
          <div className="bg-amber-500/10 text-amber-400 p-3 rounded-md text-sm">
            Could not load venue information.
          </div>
        ) : isLoadingVenue ? (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-findvenue" />
            <p className="text-findvenue-text-muted mt-2">Loading venue information...</p>
          </div>
        ) : (
          <>
            {isListening && (
              <div className="animation-pulse text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-findvenue/20 border border-findvenue mb-2 relative">
                  <div className="absolute inset-0 rounded-full bg-findvenue/10 animate-ping"></div>
                  <Mic className="h-6 w-6 text-findvenue" />
                </div>
                <p className="text-findvenue-text-muted">Listening...</p>
              </div>
            )}
            
            {transcript && (
              <div className="bg-findvenue-surface/30 p-3 rounded-md">
                <p className="text-sm text-findvenue-text-muted mb-1">You said:</p>
                <p className="text-findvenue-text">{transcript}</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-findvenue" />
                <span className="text-findvenue-text-muted">Processing your question...</span>
              </div>
            )}
            
            {response && (
              <div className="bg-findvenue/10 p-3 rounded-md">
                <p className="text-sm text-findvenue-text-muted mb-1">Response:</p>
                <p className="text-findvenue-text">{response}</p>
              </div>
            )}
            
            {!isListening && !isProcessing && !response && !transcript && (
              <div className="text-center py-4">
                <p className="text-findvenue-text-muted mb-1">
                  Ask me anything about {venue?.name}
                </p>
                <p className="text-sm text-findvenue-text-muted">
                  Press the microphone button and speak your question
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 justify-center">
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing || isLoadingVenue || !venue}
          className={`px-6 ${
            isListening 
              ? 'bg-destructive hover:bg-destructive/90' 
              : 'bg-findvenue hover:bg-findvenue-dark'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="mr-2 h-4 w-4" />
              Stop Listening
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Start Listening'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VenueSpecificVoiceAssistant;
