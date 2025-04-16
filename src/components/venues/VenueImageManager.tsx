
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VenueImageUploader from './VenueImageUploader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VenueImageManagerProps {
  venueId?: string;
  initialImages?: string[];
  onImagesUpdate: (images: string[]) => void;
  disabled?: boolean;
}

const VenueImageManager = ({ 
  venueId, 
  initialImages = [], 
  onImagesUpdate,
  disabled = false
}: VenueImageManagerProps) => {
  const [images, setImages] = useState<string[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
    onImagesUpdate(newImages);
  };

  const handleUpdateVenue = async () => {
    if (!venueId) return;
    
    setIsUploading(true);
    
    try {
      // Update venue images in Supabase
      const imageToUseAsMain = images.length > 0 ? images[0] : null;
      
      const { error } = await supabase
        .from('venues')
        .update({
          gallery_images: images,
          image_url: imageToUseAsMain
        })
        .eq('id', venueId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Venue images updated successfully'
      });
    } catch (error) {
      console.error('Error updating venue images:', error);
      toast({
        title: 'Error',
        description: 'Failed to update venue images',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Venue Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <VenueImageUploader
          existingImages={images}
          onImagesChange={handleImagesChange}
          maxImages={10}
        />
        
        <div className="flex justify-end">
          <Button 
            onClick={handleUpdateVenue} 
            disabled={disabled || isUploading || images.length === 0}
            className="bg-findvenue hover:bg-findvenue-dark"
          >
            {isUploading ? 'Saving...' : 'Save Images'}
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>💡 The first image will be used as the main image for your venue listing.</p>
          <p>📸 Upload high-quality images to showcase your venue at its best.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VenueImageManager;
