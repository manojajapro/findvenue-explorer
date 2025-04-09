
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translate: (text: string) => Promise<string>;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Cache for translations to avoid repeated API calls
const translationCache: Record<string, Record<string, string>> = {
  en: {},
  ar: {}
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en'; // Default to English
  });
  
  const isRTL = currentLanguage === 'ar';
  
  // Update document direction based on language
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
    localStorage.setItem('language', currentLanguage);
  }, [currentLanguage, isRTL]);
  
  const setLanguage = useCallback((lang: string) => {
    if (lang === 'en' || lang === 'ar') {
      setCurrentLanguage(lang);
    }
  }, []);
  
  const translate = useCallback(async (text: string): Promise<string> => {
    // If text is empty or just whitespace, return it as is
    if (!text || !text.trim()) return text;
    
    // If already in cache, return cached translation
    if (currentLanguage === 'en' || (currentLanguage === 'ar' && translationCache.ar[text])) {
      return currentLanguage === 'en' ? text : (translationCache.ar[text] || text);
    }
    
    // For now, until we implement the actual translation, just return the original text
    // When ready to implement real translation, replace this with API call
    // This is a placeholder for the actual translation implementation
    if (currentLanguage === 'ar') {
      // Simulate API call delay
      return new Promise((resolve) => {
        setTimeout(() => {
          // Store in cache for future use
          translationCache.ar[text] = text; // Replace with actual translation
          resolve(text); // Replace with actual translation
        }, 50);
      });
    }
    
    return text;
  }, [currentLanguage]);
  
  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage, translate, isRTL }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
