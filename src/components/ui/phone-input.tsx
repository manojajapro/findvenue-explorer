
import * as React from "react"
import { Input } from "@/components/ui/input"
import { Phone } from "lucide-react"

interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (value: string) => void;
}

export function PhoneInput({ className, onChange, ...props }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get the raw value
    let value = e.target.value;
    
    // If the value doesn't start with a +, add it
    if (value && !value.startsWith('+')) {
      value = '+' + value;
    }
    
    // Update the input value
    e.target.value = value;
    
    // Call the onChange handler with the formatted value
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className="relative">
      <Phone className="absolute left-3 top-3 h-4 w-4 text-findvenue-text-muted" />
      <Input
        {...props}
        type="tel"
        onChange={handleChange}
        className={`pl-10 py-2 h-12 ${className || ''}`}
        placeholder={props.placeholder || "+1 (555) 123-4567"}
      />
    </div>
  );
}
