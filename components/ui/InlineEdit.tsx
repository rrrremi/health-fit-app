import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function InlineEdit({
  value,
  onChange,
  onCancel,
  maxLength = 50,
  placeholder = 'Enter name...',
  autoFocus = true,
  className = '',
}: InlineEditProps) {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Character count
  const charCount = inputValue.length;
  const isAtLimit = charCount >= maxLength;
  
  useEffect(() => {
    // Auto focus the input when component mounts
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at the end of the text
      inputRef.current.setSelectionRange(inputValue.length, inputValue.length);
    }
  }, [autoFocus, inputValue.length]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setInputValue(newValue);
    }
  };
  
  const handleSave = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onChange(trimmedValue);
    } else {
      // If empty, cancel edit
      handleCancel();
    }
  };
  
  const handleCancel = () => {
    setInputValue(value);
    onCancel();
  };
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`w-full px-2 py-1 rounded-md bg-white/10 border ${
            isAtLimit ? 'border-destructive/50' : 'border-transparent'
          } focus:outline-none focus:border-primary/50 text-foreground text-sm`}
        />
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] ${
          isAtLimit ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          {charCount}/{maxLength}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          className="p-1 rounded-md bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
          title="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded-md bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
