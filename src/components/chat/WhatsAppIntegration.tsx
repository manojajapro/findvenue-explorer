
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PhoneInput } from '@/components/ui/phone-input';

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

  useEffect(() => {
    if (recipientPhone) {
      setPhoneNumber(recipientPhone);
    }
  }, [recipientPhone]);

  const formatPhoneNumber = (phone: string): string => {
    // Remove any non-digit characters 
    let digits = phone.replace(/\D/g, '');
    
    // If it doesn't have a country code, we can't proceed
    if (digits.length < 8) {
      return '';
    }
    
    // Make sure it doesn't start with a + sign (WhatsApp API doesn't need it)
    if (digits.startsWith('+')) {
      digits = digits.substring(1);
    }
    
    return digits;
  };

  const handleOpenWhatsApp = () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number with country code",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      if (!formattedPhone) {
        toast({
          title: "Error",
          description: "Please enter a valid phone number with country code (e.g. +1 for US)",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
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
            <DialogTitle className="text-xl">WhatsApp {recipientName}</DialogTitle>
            <DialogDescription className="text-findvenue-text-muted">
              Connect via WhatsApp to chat directly with {recipientName}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base font-medium">Phone Number (with country code)</Label>
              <PhoneInput
                id="phone"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value)}
                className="bg-findvenue-surface/50 border-white/10"
              />
              <p className="text-xs text-findvenue-text-muted mt-1">
                Include country code (e.g., +1 for US, +44 for UK)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message" className="text-base font-medium">Message</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-findvenue-surface/50 border-white/10 h-12"
              />
            </div>

            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="sharing"
                checked={isSharingEnabled}
                onCheckedChange={setIsSharingEnabled}
                className="bg-green-500"
              />
              <Label htmlFor="sharing">Share venue details in message</Label>
            </div>
          </div>
          
          <DialogFooter className="flex justify-end gap-2 mt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="h-12"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleOpenWhatsApp}
              disabled={isProcessing || !phoneNumber}
              className="bg-green-500 hover:bg-green-600 text-white h-12"
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
