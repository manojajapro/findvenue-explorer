
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { User, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Default avatar options
const defaultAvatars = [
  '/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png', // Default avatar
  'https://api.dicebear.com/6.x/personas/svg?seed=John',
  'https://api.dicebear.com/6.x/personas/svg?seed=Jane',
  'https://api.dicebear.com/6.x/personas/svg?seed=Alex',
  'https://api.dicebear.com/6.x/personas/svg?seed=Sarah',
  'https://api.dicebear.com/6.x/personas/svg?seed=Mike',
  'https://api.dicebear.com/6.x/personas/svg?seed=Emily',
  'https://api.dicebear.com/6.x/personas/svg?seed=David',
  'https://api.dicebear.com/6.x/personas/svg?seed=Lisa',
  'https://api.dicebear.com/6.x/personas/svg?seed=Chris'
];

interface AvatarSelectorProps {
  currentAvatar: string;
  firstName: string;
  lastName: string;
  onAvatarChange: (url: string) => void;
}

export const AvatarSelector = ({ 
  currentAvatar, 
  firstName, 
  lastName,
  onAvatarChange 
}: AvatarSelectorProps) => {
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Store the base64 string in the profile
          if (typeof reader.result === 'string') {
            onAvatarChange(reader.result);
            toast({
              title: "Avatar updated",
              description: "Your profile image has been updated",
            });
          }
        } catch (error) {
          console.error('Error setting avatar:', error);
          toast({
            title: "Upload failed",
            description: "There was a problem uploading your image",
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your image",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };
  
  const getInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };
  
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-24 w-24 border-2 cursor-pointer border-findvenue/20" onClick={() => setShowOptions(!showOptions)}>
          <AvatarImage src={currentAvatar} alt={`${firstName} ${lastName}`} />
          <AvatarFallback className="text-2xl bg-findvenue/10 text-findvenue">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <Button 
          size="icon" 
          variant="outline" 
          className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 bg-findvenue hover:bg-findvenue-dark"
          onClick={() => setShowOptions(!showOptions)}
        >
          <User className="h-4 w-4 text-white" />
        </Button>
      </div>
      
      {showOptions && (
        <div className="bg-findvenue-surface/80 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="mb-4">
            <Label className="block mb-2 text-sm font-medium">Choose an avatar</Label>
            <div className="grid grid-cols-5 gap-2">
              {defaultAvatars.map((avatar, index) => (
                <Avatar 
                  key={index} 
                  className={`cursor-pointer h-10 w-10 transition-all hover:scale-110 ${currentAvatar === avatar ? 'ring-2 ring-findvenue' : ''}`}
                  onClick={() => {
                    onAvatarChange(avatar);
                    setShowOptions(false);
                  }}
                >
                  <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                  <AvatarFallback className="text-xs">{index + 1}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="block mb-2 text-sm font-medium">Upload your own</Label>
            <div className="flex items-center space-x-2">
              <Label 
                htmlFor="avatar-upload"
                className="flex items-center justify-center px-4 py-2 border border-findvenue-surface rounded-md cursor-pointer bg-findvenue hover:bg-findvenue-dark text-white text-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                <span>{isUploading ? 'Uploading...' : 'Upload image'}</span>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>
            <p className="mt-2 text-xs text-findvenue-text-muted">JPEG, PNG or GIF. Max 5MB.</p>
          </div>
        </div>
      )}
    </div>
  );
};
