
import { useState, useEffect } from 'react';
import { Mic, MicOff, X, Volume2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVenueVoiceAssistant } from '@/hooks/useVenueVoiceAssistant';
import { Skeleton } from '@/components/ui/skeleton';

const VenueSpecificVoiceAssistant = () => {
  const [showHint, setShowHint] = useState(true);
  const { 
    isListening, 
    transcript, 
    response, 
    isProcessing, 
    error, 
    startListening, 
    stopListening, 
    toggleAutoRestart,
    autoRestart,
    isSpeaking,
    venue,
    isLoadingVenue
  } = useVenueVoiceAssistant();

  // Hide hint after 10 seconds
  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => {
        setShowHint(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showHint]);

  return (
    <Card className="overflow-hidden border border-white/10 bg-findvenue-card-bg">
      {/* Header */}
      <div className="bg-findvenue p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Volume2 className="h-5 w-5 mr-2 text-white" />
          <h3 className="font-semibold text-white">Voice Assistant</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={autoRestart ? "default" : "outline"}
            className={cn(
              "cursor-pointer",
              autoRestart ? "bg-green-600 hover:bg-green-700" : "text-findvenue-text-muted"
            )}
            onClick={toggleAutoRestart}
          >
            {autoRestart ? "Continuous" : "Manual"}
          </Badge>
        </div>
      </div>
      
      {/* Voice assistant content */}
      <div className="p-6 flex flex-col">
        {isLoadingVenue ? (
          <div className="flex flex-col items-center">
            <Skeleton className="h-16 w-16 rounded-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : !venue ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Could not load venue information. Please try again.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Status indicator */}
            <div className="flex items-center justify-center mb-6">
              <div 
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center relative",
                  isListening ? "bg-findvenue-surface" : "bg-findvenue-dark-bg",
                )}
              >
                {isListening && (
                  <div className="absolute w-full h-full rounded-full bg-findvenue/20 animate-ping"></div>
                )}
                {isSpeaking ? (
                  <div className="flex flex-col items-center justify-center">
                    <Volume2 className="h-8 w-8 text-findvenue animate-pulse" />
                    <span className="text-xs text-findvenue-text-muted mt-1">Speaking</span>
                  </div>
                ) : isProcessing ? (
                  <Loader2 className="h-8 w-8 text-findvenue animate-spin" />
                ) : isListening ? (
                  <Mic className="h-8 w-8 text-findvenue" />
                ) : (
                  <MicOff className="h-8 w-8 text-findvenue-text-muted" />
                )}
              </div>
            </div>
            
            {/* Transcript and Response */}
            <div className="w-full space-y-4 mb-6">
              {transcript && (
                <div className="space-y-1">
                  <p className="text-sm text-findvenue-text-muted">You said:</p>
                  <div className="p-3 bg-findvenue-surface/50 rounded-lg text-findvenue-text">
                    {transcript}
                  </div>
                </div>
              )}
              
              {response && (
                <div className="space-y-1">
                  <p className="text-sm text-findvenue-text-muted">Assistant:</p>
                  <div className="p-3 bg-findvenue/10 rounded-lg text-findvenue-text">
                    {response}
                  </div>
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {!transcript && !response && !error && (
                <div className="text-center py-4">
                  <p className="text-findvenue-text-muted">
                    Ask me anything about {venue.name}
                  </p>
                </div>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex justify-center gap-4">
              {isListening ? (
                <Button 
                  variant="outline" 
                  className="border-findvenue-gold text-findvenue-gold hover:bg-findvenue-gold/10"
                  onClick={stopListening}
                  disabled={isProcessing}
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Listening
                </Button>
              ) : (
                <Button 
                  className="bg-findvenue hover:bg-findvenue-dark"
                  onClick={startListening}
                  disabled={isProcessing || isSpeaking}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Speaking
                </Button>
              )}
              
              {response && (
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => {
                    setTranscript('');
                    setShowHint(false);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Tips */}
      {showHint && venue && (
        <div className="p-4 border-t border-white/10 bg-findvenue-dark-bg/75">
          <p className="text-xs text-findvenue-text-muted text-center">
            Try saying: "Tell me about {venue.name}" or "What amenities does this venue offer?"
          </p>
        </div>
      )}
    </Card>
  );
};

export default VenueSpecificVoiceAssistant;
