
import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';

const LanguageSwitcher = () => {
  const { currentLanguage, setLanguage } = useTranslation();
  
  const toggleLanguage = () => {
    setLanguage(currentLanguage === 'en' ? 'ar' : 'en');
  };
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleLanguage}
      className="text-findvenue-text"
    >
      {currentLanguage === 'en' ? 'العربية' : 'English'}
    </Button>
  );
};

export default LanguageSwitcher;
