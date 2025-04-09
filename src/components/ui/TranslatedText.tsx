
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface TranslatedTextProps {
  text: string;
  as?: React.ElementType;
  className?: string;
}

const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  text, 
  as: Component = 'span', 
  className = '', 
  ...props 
}) => {
  const { translate, currentLanguage } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    translate(text)
      .then((result) => {
        if (isMounted) {
          setTranslatedText(result);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTranslatedText(text); // Fallback to original text
          setIsLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, [text, translate, currentLanguage]);
  
  return (
    <Component 
      className={`${className} ${isLoading ? 'opacity-70' : ''}`} 
      {...props}
    >
      {translatedText}
    </Component>
  );
};

export default TranslatedText;
