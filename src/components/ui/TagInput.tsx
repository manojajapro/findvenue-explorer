
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  defaultValue?: string | string[];
}

const TagInput = ({ 
  tags, 
  setTags, 
  placeholder = "Add new item...", 
  label, 
  className,
  defaultValue 
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');

  // Process default values if provided
  useEffect(() => {
    if (defaultValue && tags.length === 0) {
      let initialTags: string[] = [];
      
      if (typeof defaultValue === 'string') {
        // Handle string that might be JSON array representation
        try {
          const parsed = JSON.parse(defaultValue);
          if (Array.isArray(parsed)) {
            initialTags = parsed;
          } else {
            initialTags = [defaultValue];
          }
        } catch (e) {
          // If parsing fails, use as single tag
          initialTags = [defaultValue];
        }
      } else if (Array.isArray(defaultValue)) {
        initialTags = defaultValue.map(item => item?.toString() || '').filter(Boolean);
      }
      
      setTags(initialTags);
      console.log("TagInput: Initialized with default values:", initialTags);
    }
  }, [defaultValue, setTags, tags.length]);

  const handleAddTag = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;
    
    // Prevent duplicate tags
    if (!tags.includes(trimmedValue)) {
      setTags([...tags, trimmedValue]);
      console.log("Added tag:", trimmedValue, "New tags array:", [...tags, trimmedValue]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    console.log("Removed tag:", tagToRemove, "New tags array:", newTags);
  };

  return (
    <div className={className}>
      {label && <div className="mb-2 text-sm font-medium">{label}</div>}
      
      <div className="flex gap-2 mb-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-grow"
        />
        <Button 
          type="button" 
          onClick={handleAddTag}
          variant="secondary"
          className="shrink-0"
        >
          Add
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2">
        {tags.map((tag, index) => (
          <div 
            key={`${tag}-${index}`} 
            className="flex items-center gap-1 px-2 py-1 text-sm bg-secondary rounded-md"
          >
            <span>{tag}</span>
            <button 
              type="button" 
              onClick={() => handleRemoveTag(tag)} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {tags.length === 0 && (
          <div className="text-sm text-muted-foreground">No items added yet</div>
        )}
      </div>
    </div>
  );
};

export default TagInput;
