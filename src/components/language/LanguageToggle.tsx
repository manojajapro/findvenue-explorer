
import React from 'react';
import { Globe } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useTranslation } from '@/hooks/useTranslation';

const LanguageToggle = () => {
  const { currentLanguage } = useTranslation();
  
  // Function is now empty/disabled
  const toggleLanguage = () => {
    // No-op since we're removing Arabic conversion
    console.log("Language toggle disabled in current version");
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Toggle 
        pressed={false} 
        onPressedChange={toggleLanguage}
        size="sm"
        aria-label="Toggle language"
        disabled={true}
      >
        <span className="text-xs font-medium">EN</span>
      </Toggle>
      <div className="hidden sm:block">
        <span className="text-xs text-muted-foreground">Language</span>
      </div>
    </div>
  );
};

export default LanguageToggle;
