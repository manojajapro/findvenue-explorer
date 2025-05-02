
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Instagram, Twitter, Send, Share2, Link } from 'lucide-react';

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
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareOnTelegram = () => {
    const telegramUrl = `https://telegram.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    window.open(telegramUrl, '_blank');
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareOnInstagram = () => {
    // Instagram doesn't have a direct web sharing API
    // Copy the link and show instructions to share on Instagram
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Instagram sharing",
        description: "Link copied! Open Instagram app, create a new story/post, and paste the link",
        duration: 5000,
      });
    }).catch(err => {
      console.error('Error copying for Instagram:', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy link for Instagram sharing",
        variant: "destructive",
      });
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
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
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
        onClick={handleCopyLink}
        title="Copy Link"
      >
        <Link className="h-5 w-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="bg-findvenue/10 hover:bg-findvenue/20 text-findvenue rounded-full"
        onClick={handleShare}
        title="Share"
      >
        <Share2 className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default SocialShareButtons;
