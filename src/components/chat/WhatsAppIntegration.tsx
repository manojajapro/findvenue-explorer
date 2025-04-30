
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, MessageSquare, Send, Share } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface WhatsAppIntegrationProps {
  recipientName: string;
  recipientPhone?: string;
  messageText?: string;
  venueName?: string;
}

const WhatsAppIntegration = ({
  recipientName,
  recipientPhone = '',
  messageText = '',
  venueName = ''
}: WhatsAppIntegrationProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(recipientPhone);
  const [message, setMessage] = useState(messageText || `Hi! I'm interested in discussing ${venueName}.`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSharingEnabled, setIsSharingEnabled] = useState(true);
  const { toast } = useToast();

  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // Ensure it starts with a plus sign if it doesn't
    if (!digits.startsWith('+')) {
      digits = '+' + digits;
    }
    
    return digits;
  };

  const handleOpenWhatsApp = () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "WhatsApp Opening",
        description: `Redirecting to chat with ${recipientName}`,
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast({
        title: "Error",
        description: "Failed to open WhatsApp. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2 border-green-500/30 text-green-500 hover:bg-green-500/10"
        onClick={() => setIsDialogOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        WhatsApp
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-findvenue-card-bg border-white/10">
          <DialogHeader>
            <DialogTitle>WhatsApp {recipientName}</DialogTitle>
            <DialogDescription className="text-findvenue-text-muted">
              Connect via WhatsApp to chat directly with {recipientName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-findvenue-surface/50 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-findvenue-surface/50 border-white/10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="sharing"
                checked={isSharingEnabled}
                onCheckedChange={setIsSharingEnabled}
              />
              <Label htmlFor="sharing">Share venue details in message</Label>
            </div>
          </div>
          
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOpenWhatsApp}
              disabled={isProcessing || !phoneNumber}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Open WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppIntegration;
