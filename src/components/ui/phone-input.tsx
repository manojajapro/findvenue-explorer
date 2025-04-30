
import * as React from "react"
import { Input } from "@/components/ui/input"

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
    <Input
      {...props}
      type="tel"
      onChange={handleChange}
      className={className}
    />
  );
}
