import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface StyledSelectOption {
  value: string;
  label: string;
}

interface StyledSelectProps {
  value: string;
  options: StyledSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Выберите значение',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 text-left text-white transition-all ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`${selectedOption ? 'text-white' : 'text-[#ab888e]'} truncate`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#ab888e] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[10px] border border-[#5b3f44] bg-[linear-gradient(180deg,rgba(15,18,24,0.98),rgba(31,15,18,0.95))] shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl ${menuClassName}`}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-[rgba(255,76,131,0.10)] text-white'
                      : 'text-[#d7c1c7] hover:bg-white/[0.04] hover:text-white'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#ffb1c0]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
