
/**
 * Converts a File object to a base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Validates if a file is an image and within size limit
 * @param file The file to validate
 * @param maxSize Maximum size in bytes (default: 5MB)
 * @returns An object with validation result and optional error message
 */
export const validateImage = (file: File, maxSize: number = 5 * 1024 * 1024) => {
  if (!file.type.includes('image/')) {
    return {
      valid: false,
      error: 'Please upload an image file'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Please upload an image smaller than ${maxSize / (1024 * 1024)}MB`
    };
  }

  return { valid: true };
};

/**
 * Converts multiple files to base64 strings
 */
export const filesToBase64 = async (files: FileList): Promise<string[]> => {
  const promises: Promise<string>[] = [];
  
  for (let i = 0; i < files.length; i++) {
    promises.push(fileToBase64(files[i]));
  }
  
  return Promise.all(promises);
};
