
import React from 'react';
import { Languages } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import TranslatedText from '@/components/ui/TranslatedText';

const LanguageToggle = () => {
  const { currentLanguage, setLanguage, isRTL } = useTranslation();
  
  const handleToggle = (checked: boolean) => {
    setLanguage(checked ? 'ar' : 'en');
  };

  return (
    <div className="flex items-center space-x-2 rtl:space-x-reverse">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className={`text-xs ${currentLanguage === 'en' ? 'font-medium' : 'text-muted-foreground'}`}>EN</span>
        <Switch 
          checked={currentLanguage === 'ar'} 
          onCheckedChange={handleToggle}
          aria-label="Toggle language"
        />
        <span className={`text-xs ${currentLanguage === 'ar' ? 'font-medium' : 'text-muted-foreground'}`}>عربي</span>
      </div>
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
