
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { WhatsApp, Instagram, Twitter, Send, Share2 } from 'lucide-react';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  className?: string;
}

const SocialShareButtons = ({ 
  url, 
  title, 
  description = '', 
  imageUrl = '',
  className = '' 
}: SocialShareButtonsProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        toast({
          title: "Link copied!",
          description: "Venue link has been copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        toast({
          title: "Copy failed",
          description: "Failed to copy link to clipboard",
          variant: "destructive",
        });
      });
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareOnTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    window.open(telegramUrl, '_blank');
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareOnInstagram = () => {
    // Instagram doesn't support direct sharing via URL
    // Copy link and inform user
    navigator.clipboard.writeText(url);
    toast({
      title: "Instagram sharing",
      description: "Link copied! Open Instagram and paste in your story or DM",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: description,
        url: url,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="icon"
        className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-full"
        onClick={shareOnWhatsApp}
        title="Share on WhatsApp"
      >
        <WhatsApp className="h-5 w-5" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] rounded-full"
        onClick={shareOnTelegram}
        title="Share on Telegram"
      >
        <Send className="h-5 w-5" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="bg-[#E4405F]/10 hover:bg-[#E4405F]/20 text-[#E4405F] rounded-full"
        onClick={shareOnInstagram}
        title="Share on Instagram"
      >
        <Instagram className="h-5 w-5" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-full"
        onClick={shareOnTwitter}
        title="Share on Twitter"
      >
        <Twitter className="h-5 w-5" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="bg-findvenue/10 hover:bg-findvenue/20 text-findvenue rounded-full"
        onClick={handleShare}
        title="Copy or Share Link"
      >
        <Share2 className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default SocialShareButtons;
