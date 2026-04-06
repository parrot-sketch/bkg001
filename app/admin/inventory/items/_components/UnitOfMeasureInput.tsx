'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ALL_UNITS_FLAT, getUnitCategories } from '@/domain/constants/UnitsOfMeasure';

interface UnitOfMeasureInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  showLabel?: boolean;
}

/**
 * Reusable Unit of Measure input component with preset options and custom input
 * Features:
 * - Grouped dropdown with common units
 * - Custom option for user-defined units
 * - Fallback to text input when custom value is used
 */
export function UnitOfMeasureInput({
  value,
  onChange,
  label = 'Unit of Measure',
  placeholder = 'Select or enter custom unit',
  id = 'uom',
  showLabel = true,
}: UnitOfMeasureInputProps) {
  const [showCustom, setShowCustom] = useState(() => {
    // Show custom input if value is not in predefined list
    return value && !ALL_UNITS_FLAT.some(u => u.toLowerCase() === value.toLowerCase());
  });

  const categories = getUnitCategories();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === 'CUSTOM') {
      setShowCustom(true);
      onChange('');
    } else {
      setShowCustom(false);
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      {showLabel && <Label htmlFor={id}>{label}</Label>}
      
      {!showCustom ? (
        <select
          id={id}
          value={value}
          onChange={handleSelectChange}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Choose a unit...</option>
          
          {categories.map((category) => (
            <optgroup key={category.label} label={category.label}>
              {category.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </optgroup>
          ))}
          
          <option value="CUSTOM">Custom...</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <Input
            id={id}
            type="text"
            value={value}
            onChange={handleCustomChange}
            placeholder={placeholder}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              setShowCustom(false);
              onChange('');
            }}
            className="px-3 py-2 text-sm border border-input rounded-md hover:bg-accent"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}
