
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { filesToBase64, validateImage } from '@/utils/imageUtils';

interface VenueImageUploaderProps {
  existingImages?: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const VenueImageUploader = ({ 
  existingImages = [], 
  onImagesChange, 
  maxImages = 10 
}: VenueImageUploaderProps) => {
  const [images, setImages] = useState<string[]>(existingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Check if we'd exceed the max number of images
    if (images.length + files.length > maxImages) {
      toast({
        title: 'Too many images',
        description: `You can only upload a maximum of ${maxImages} images`,
        variant: 'destructive'
      });
      return;
    }
    
    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const validation = validateImage(files[i]);
      if (!validation.valid) {
        toast({
          title: 'Invalid image',
          description: validation.error,
          variant: 'destructive'
        });
        return;
      }
    }
    
    try {
      const base64Images = await filesToBase64(files);
      const updatedImages = [...images, ...base64Images];
      setImages(updatedImages);
      onImagesChange(updatedImages);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'Success',
        description: `${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to process images. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card key={index} className="relative overflow-hidden group aspect-[4/3]">
            <img 
              src={image} 
              alt={`Venue image ${index + 1}`} 
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {index === 0 && (
              <div className="absolute top-2 left-2 bg-findvenue text-white text-xs px-2 py-1 rounded-md">
                Primary
              </div>
            )}
          </Card>
        ))}
        
        {images.length < maxImages && (
          <Card 
            className="border-dashed border-2 aspect-[4/3] flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-center text-muted-foreground">Upload Images</p>
            <p className="text-xs text-center text-muted-foreground mt-1">
              {images.length}/{maxImages} images
            </p>
          </Card>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <p>Supported formats: JPEG, PNG, WebP</p>
          <p>Maximum file size: 5MB</p>
        </div>
        
        <Button 
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={images.length >= maxImages}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Select Images
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default VenueImageUploader;
