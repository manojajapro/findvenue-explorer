
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Default avatars
const defaultAvatars = [
  '/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png', // Default user image
  '/lovable-uploads/25610b8c-bf06-4ae3-8110-9c4e8133a31b.png',
  '/lovable-uploads/545c1cde-048c-4d24-a229-8931fc3147c8.png',
  '/avatar-1.png',
  '/avatar-2.png',
  '/avatar-3.png',
  '/avatar-4.png',
  '/avatar-5.png',
  '/avatar-6.png',
  '/avatar-7.png',
];

interface AvatarSelectorProps {
  currentAvatar?: string;
  onAvatarChange: (url: string) => void;
  initials: string;
}

const AvatarSelector = ({ currentAvatar, onAvatarChange, initials }: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || '');
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSelectAvatar = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    onAvatarChange(avatarUrl);
    setIsOpen(false);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      handleSelectAvatar(base64);
      toast({
        title: 'Success',
        description: 'Profile image uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className="relative cursor-pointer group">
            <Avatar className="h-24 w-24 border-2 border-findvenue/20">
              <AvatarImage src={selectedAvatar} alt="Profile" />
              <AvatarFallback className="text-2xl bg-findvenue/10 text-findvenue">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity duration-200">
              <span className="text-white text-xs font-medium">Change</span>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Profile Picture</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-5 gap-2 my-4">
            {defaultAvatars.map((avatar, index) => (
              <Avatar 
                key={index}
                className={`h-16 w-16 cursor-pointer transition-all ${selectedAvatar === avatar ? 'ring-2 ring-findvenue scale-110' : 'hover:scale-105'}`}
                onClick={() => handleSelectAvatar(avatar)}
              >
                <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          
          <div className="flex flex-col items-center space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm text-muted-foreground">Or upload your own</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <UploadCloud className="mr-2 h-4 w-4" /> Upload Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvatarSelector;
