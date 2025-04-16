
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Check, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Default avatar options
const defaultAvatars = [
  '/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
];

interface AvatarSelectorProps {
  currentAvatar?: string;
  firstName?: string;
  lastName?: string;
  onAvatarSelect: (url: string) => void;
  userId: string;
}

export const AvatarSelector = ({ 
  currentAvatar, 
  firstName = '', 
  lastName = '',
  onAvatarSelect,
  userId
}: AvatarSelectorProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentAvatar || null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handlePresetAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
  };

  const handleCustomUrlSubmit = () => {
    if (!customAvatarUrl) {
      toast({
        title: "Error",
        description: "Please enter an image URL",
        variant: "destructive"
      });
      return;
    }

    setSelectedAvatar(customAvatarUrl);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "File must be an image",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create a unique file path for the avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `user_avatars/${userId}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('user_avatars')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user_avatars')
        .getPublicUrl(filePath);
      
      if (urlData?.publicUrl) {
        setSelectedAvatar(urlData.publicUrl);
        toast({
          title: "Success",
          description: "Avatar uploaded successfully"
        });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const confirmAvatarSelection = () => {
    if (selectedAvatar) {
      onAvatarSelect(selectedAvatar);
      setIsDialogOpen(false);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated"
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className="flex flex-col items-center space-y-3 cursor-pointer">
          <Avatar className="h-24 w-24 border-2 border-findvenue/20 hover:border-findvenue/40 transition-all">
            <AvatarImage 
              src={currentAvatar || "/lovable-uploads/7fce1275-bc02-4586-a290-d55d1afa4a80.png"} 
              alt={`${firstName} ${lastName}`} 
            />
            <AvatarFallback className="text-2xl bg-findvenue/10 text-findvenue">
              {firstName.charAt(0)}{lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm">
            Change Avatar
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Profile Picture</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="preset" className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="preset">Default Avatars</TabsTrigger>
            <TabsTrigger value="url">Custom URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preset" className="mt-4">
            <div className="grid grid-cols-5 gap-2">
              {defaultAvatars.map((avatar, index) => (
                <div 
                  key={index} 
                  className={`relative rounded-md overflow-hidden cursor-pointer border-2 
                    ${selectedAvatar === avatar ? 'border-findvenue' : 'border-transparent hover:border-findvenue/30'}`}
                  onClick={() => handlePresetAvatarSelect(avatar)}
                >
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                    <AvatarFallback>?</AvatarFallback>
                  </Avatar>
                  {selectedAvatar === avatar && (
                    <div className="absolute top-0 right-0 bg-findvenue rounded-full p-0.5 m-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter image URL"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCustomUrlSubmit}
              >
                Preview
              </Button>
            </div>
            
            {customAvatarUrl && (
              <div className="flex justify-center py-2">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={customAvatarUrl} alt="Custom avatar preview" />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div className="flex justify-center">
                <label 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-findvenue-surface/30 border-white/20 hover:border-white/40"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-findvenue-text-muted" />
                    <p className="text-sm text-findvenue-text">
                      <span className="font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-findvenue-text-muted">
                      PNG, JPG, WEBP (MAX. 5MB)
                    </p>
                  </div>
                  <Input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              
              {isUploading && (
                <div className="flex justify-center">
                  <p className="text-sm text-findvenue-text-muted">Uploading...</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmAvatarSelection} disabled={!selectedAvatar}>
            Save Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
