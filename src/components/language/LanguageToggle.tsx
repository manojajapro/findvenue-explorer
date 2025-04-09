
import React from 'react';
import { Globe } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useTranslation } from '@/hooks/useTranslation';
import TranslatedText from '@/components/ui/TranslatedText';

const LanguageToggle = () => {
  const { currentLanguage, setLanguage, isRTL } = useTranslation();
  
  const toggleLanguage = () => {
    setLanguage(currentLanguage === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Toggle 
        pressed={currentLanguage === 'ar'} 
        onPressedChange={toggleLanguage}
        size="sm"
        aria-label="Toggle language"
      >
        <span className={`text-xs ${currentLanguage === 'en' ? 'font-medium' : 'text-muted-foreground'}`}>
          {currentLanguage === 'en' ? 'EN' : 'عربي'}
        </span>
      </Toggle>
      <div className="hidden sm:block">
        <TranslatedText 
          text="Language" 
          as="span" 
          className="text-xs text-muted-foreground" 
        />
      </div>
    </div>
  );
};

export default LanguageToggle;
