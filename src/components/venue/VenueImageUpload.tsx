
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { useImageProcessing } from '@/hooks/useImageProcessing';

interface VenueImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export const VenueImageUpload = ({
  images = [],
  onImagesChange,
  maxImages = 10
}: VenueImageUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { processImage, isProcessing } = useImageProcessing();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    if (images.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can only upload a maximum of ${maxImages} images.`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const newImages: string[] = [];
      
      for (const file of files) {
        try {
          const base64Image = await processImage(file);
          newImages.push(base64Image);
        } catch (error) {
          console.error("Error processing image:", error);
          // Continue with next file
        }
      }
      
      onImagesChange([...images, ...newImages]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your images.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="images">Venue Images</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isProcessing || images.length >= maxImages}
            className="w-full border-white/10 hover:bg-white/5"
          >
            {isUploading || isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload Images
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-findvenue-text-muted">
          Upload up to {maxImages} high-quality images (JPEG, PNG, WebP). Each image should be less than 5MB.
          {images.length === 0 && " At least one image is required."}
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Venue image ${index + 1}`}
                className="w-full h-32 object-cover rounded-md border border-white/10"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 right-0 bg-black/50 px-2 py-0.5 rounded-tl-md text-xs text-white">
                {index === 0 ? "Cover" : `#${index + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
