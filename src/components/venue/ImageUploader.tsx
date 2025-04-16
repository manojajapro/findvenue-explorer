
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  onImagesUploaded: (urls: string[]) => void;
  maxImages?: number;
  venueId?: string;
}

const ImageUploader = ({ onImagesUploaded, maxImages = 10, venueId = 'new-venue' }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const { toast } = useToast();
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (!files || files.length === 0) {
      return;
    }
    
    // Check number of files
    if (files.length > maxImages) {
      toast({
        title: "Too many files",
        description: `You can upload a maximum of ${maxImages} images at once`,
        variant: "destructive"
      });
      return;
    }
    
    // Prepare upload
    setUploading(true);
    const newProgress: {[key: string]: number} = {};
    const filesToUpload = Array.from(files);
    
    // Initialize progress tracking
    filesToUpload.forEach(file => {
      newProgress[file.name] = 0;
    });
    setUploadProgress(newProgress);
    
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds the 10MB size limit`);
        }
        
        // Create unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `venues/${venueId}/${fileName}`;
        
        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('venue_images')
          .upload(filePath, file, {
            upsert: false,
            cacheControl: '3600',
          });
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('venue_images')
          .getPublicUrl(filePath);
        
        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));
        
        return urlData.publicUrl;
      });
      
      const urls = await Promise.all(uploadPromises);
      
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${urls.length} images`,
      });
      
      onImagesUploaded(urls);
      
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };
  
  return (
    <div className="space-y-4">
      <div className={`border-2 border-dashed rounded-lg p-6 text-center
        ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-findvenue/40'}`}
      >
        <label htmlFor="image-upload" className={`flex flex-col items-center ${uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          {uploading ? (
            <Loader2 className="h-12 w-12 text-findvenue-text-muted animate-spin mb-3" />
          ) : (
            <UploadCloud className="h-12 w-12 text-findvenue-text-muted mb-3" />
          )}
          <p className="text-findvenue mb-1 font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-findvenue-text-muted mb-3">
            PNG, JPG or WEBP (MAX. 10MB per image)
          </p>
          <Button 
            type="button" 
            variant="outline"
            disabled={uploading}
            className="pointer-events-auto"
          >
            Select Images
          </Button>
          <Input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFileUpload}
          />
        </label>
      </div>
      
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="bg-findvenue-surface/30 rounded-md p-3 border border-white/10">
          <h4 className="text-sm font-medium mb-2">Uploading images...</h4>
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate max-w-[70%]">
                  <ImageIcon className="h-4 w-4 text-findvenue-text-muted" />
                  <span className="truncate">{fileName}</span>
                </div>
                <div className="flex items-center">
                  {progress < 100 ? (
                    <span>{progress}%</span>
                  ) : (
                    <span className="text-green-500">Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
