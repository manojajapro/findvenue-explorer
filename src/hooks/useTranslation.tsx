
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LanguageContextType = {
  currentLanguage: string;
  translate: (text: string) => Promise<string>;
  setLanguage: (language: string) => void;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Get browser language or stored preference
    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage) return storedLanguage;
    
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'ar' ? 'ar' : 'en';
  });
  
  const [isRTL, setIsRTL] = useState(currentLanguage === 'ar');
  const [translationCache, setTranslationCache] = useState<Record<string, Record<string, string>>>({});
  
  // Update document direction for RTL languages
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [isRTL, currentLanguage]);
  
  const setLanguage = (language: string) => {
    setCurrentLanguage(language);
    setIsRTL(language === 'ar');
    localStorage.setItem('preferredLanguage', language);
  };
  
  const translate = async (text: string): Promise<string> => {
    // If text is empty, return empty
    if (!text) return '';
    
    // If we're in English and the text isn't Arabic, or vice versa, no need to translate
    const isArabicText = /[\u0600-\u06FF]/.test(text);
    if ((currentLanguage === 'en' && !isArabicText) || (currentLanguage === 'ar' && isArabicText)) {
      return text;
    }
    
    // Check cache first
    if (translationCache[text] && translationCache[text][currentLanguage]) {
      return translationCache[text][currentLanguage];
    }

    // Translate text using LibreTranslate API
    // Note: In a production app, you might want to use a more robust service
    try {
      const sourceLang = isArabicText ? 'ar' : 'en';
      const targetLang = currentLanguage;
      
      if (sourceLang === targetLang) return text;
      
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
        }),
      });
      
      if (!response.ok) {
        console.error('Translation API error:', response.statusText);
        return text; // Fallback to original text
      }
      
      const data = await response.json();
      const translatedText = data.translatedText || text;
      
      // Cache the result
      setTranslationCache(prev => ({
        ...prev,
        [text]: {
          ...prev[text],
          [currentLanguage]: translatedText,
        },
      }));
      
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text
    }
  };
  
  const value = {
    currentLanguage,
    translate,
    setLanguage,
    isRTL,
  };
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
