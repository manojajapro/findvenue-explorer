
import * as React from "react"
import { Input } from "@/components/ui/input"

interface PhoneInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange?: (value: string) => void;
}

export function PhoneInput({ className, onChange, ...props }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format phone number: (123) 456-7890
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length > 0) {
      if (value.length <= 3) {
        value = `(${value}`;
      } else if (value.length <= 6) {
        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
      } else {
        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
      }
    }
    
    // Update the input value
    e.target.value = value;
    
    // Call the onChange handler with the raw value
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
