
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Facebook, Twitter, Linkedin, Instagram, Share2, Copy, Link2 } from 'lucide-react';

interface ShareVenueProps {
  venueName: string;
  venueId: string;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
}

export default function ShareVenue({ 
  venueName, 
  venueId, 
  facebookUrl, 
  twitterUrl, 
  instagramUrl, 
  linkedinUrl 
}: ShareVenueProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const shareUrl = `${window.location.origin}/venue/${venueId}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Venue link has been copied to your clipboard",
      });
      setIsOpen(false);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy the link to clipboard",
        variant: "destructive",
      });
    });
  };
  
  const shareOnFacebook = () => {
    if (facebookUrl) {
      window.open(facebookUrl, '_blank');
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    }
    setIsOpen(false);
  };
  
  const shareOnTwitter = () => {
    if (twitterUrl) {
      window.open(twitterUrl, '_blank');
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${venueName}`)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    }
    setIsOpen(false);
  };
  
  const shareOnLinkedin = () => {
    if (linkedinUrl) {
      window.open(linkedinUrl, '_blank');
    } else {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    }
    setIsOpen(false);
  };
  
  const shareOnInstagram = () => {
    if (instagramUrl) {
      window.open(instagramUrl, '_blank');
    } else {
      // Instagram doesn't have a direct share URL like other platforms
      toast({
        title: "Instagram sharing",
        description: "Copy the link and share it on Instagram",
      });
      navigator.clipboard.writeText(shareUrl);
    }
    setIsOpen(false);
  };
  
  const hasSocialLinks = facebookUrl || twitterUrl || instagramUrl || linkedinUrl;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="bg-black/30 text-white hover:bg-black/50"
          aria-label="Share venue"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-findvenue-card-bg border-white/10">
        <div className="space-y-4">
          <h3 className="font-medium">Share this venue</h3>
          
          <div className="flex items-center space-x-2">
            <Input 
              value={shareUrl} 
              readOnly 
              className="bg-findvenue-surface/50 border-white/10"
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="shrink-0 border-white/10 hover:bg-findvenue-surface/70"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="pt-2">
            <p className="text-sm text-findvenue-text-muted mb-3">Share via:</p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-white/10 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
                onClick={shareOnFacebook}
              >
                <Facebook className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-white/10 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400"
                onClick={shareOnTwitter}
              >
                <Twitter className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-white/10 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400"
                onClick={shareOnInstagram}
              >
                <Instagram className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-white/10 bg-blue-700/20 hover:bg-blue-700/30 text-blue-500"
                onClick={shareOnLinkedin}
              >
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {hasSocialLinks && (
            <div className="pt-2">
              <p className="text-sm text-findvenue-text-muted mb-3">Visit venue's social media:</p>
              <div className="flex space-x-2">
                {facebookUrl && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full border-white/10 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400"
                    onClick={() => window.open(facebookUrl, '_blank')}
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                )}
                
                {twitterUrl && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full border-white/10 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400"
                    onClick={() => window.open(twitterUrl, '_blank')}
                  >
                    <Twitter className="h-4 w-4" />
                  </Button>
                )}
                
                {instagramUrl && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full border-white/10 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400"
                    onClick={() => window.open(instagramUrl, '_blank')}
                  >
                    <Instagram className="h-4 w-4" />
                  </Button>
                )}
                
                {linkedinUrl && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full border-white/10 bg-blue-700/20 hover:bg-blue-700/30 text-blue-500"
                    onClick={() => window.open(linkedinUrl, '_blank')}
                  >
                    <Linkedin className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
