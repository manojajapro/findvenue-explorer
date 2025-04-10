
import React, { createContext, useContext, useState, useCallback } from 'react';

interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translate: (text: string) => Promise<string>;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default is English, remove Arabic functionality
  const [currentLanguage] = useState('en');
  const isRTL = false;
  
  const setLanguage = useCallback((_lang: string) => {
    // No-op since we're removing Arabic conversion
    console.log("Language switching disabled in current version");
  }, []);
  
  const translate = useCallback(async (text: string): Promise<string> => {
    // Simply return the original text without translation
    return text;
  }, []);
  
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
