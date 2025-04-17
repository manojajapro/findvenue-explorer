
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseImageProcessingReturn {
  isProcessing: boolean;
  processImage: (file: File) => Promise<string>;
  convertToBase64: (file: File) => Promise<string>;
}

export const useImageProcessing = (): UseImageProcessingReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const convertToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const processImage = async (file: File): Promise<string> => {
    try {
      setIsProcessing(true);
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        throw new Error("Not an image file");
      }
      
      // Check file size (limit to 5MB)
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        throw new Error("File too large");
      }
      
      // Convert to base64
      const base64String = await convertToBase64(file);
      
      // Compress if needed
      // This is a simple implementation - for production, consider using a proper image compression library
      if (base64String.length > 1500000) { // Roughly 1.5MB in base64
        // Create temporary image element
        const img = new Image();
        await new Promise(resolve => {
          img.onload = resolve;
          img.src = base64String;
        });
        
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error("Could not get canvas context for image compression");
        }
        
        // Calculate new dimensions (maintain aspect ratio)
        const maxDimension = 1200;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        // Resize and draw image to canvas
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to compressed base64 image
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        canvas.remove();
        
        return compressedBase64;
      }
      
      return base64String;
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processImage,
    convertToBase64
  };
};
