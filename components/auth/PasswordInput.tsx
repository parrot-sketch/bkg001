'use client';

/**
 * Password Input Component
 * 
 * Secure password input with visibility toggle and caps lock detection.
 * Features:
 * - Show/hide password toggle
 * - Caps lock detection and warning
 * - Accessible ARIA labels
 * - Proper keyboard navigation
 */

import { useState, useRef, useEffect, forwardRef } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  showCapsLockWarning?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ 
    className, 
    showCapsLockWarning = true,
    ...props 
  }, ref) {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = ref || internalRef;

    // Detect caps lock on keydown/keyup
    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          setCapsLockOn(true);
        } else {
          setCapsLockOn(false);
        }
      };

      const input = typeof inputRef === 'function' ? null : inputRef.current;
      if (input) {
        input.addEventListener('keydown', handleKeyPress);
        input.addEventListener('keyup', handleKeyPress);
      }

      return () => {
        if (input) {
          input.removeEventListener('keydown', handleKeyPress);
          input.removeEventListener('keyup', handleKeyPress);
        }
      };
    }, [inputRef]);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
      // Maintain focus on input after toggle
      const input = typeof inputRef === 'function' ? null : inputRef.current;
      setTimeout(() => input?.focus(), 0);
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={inputRef}
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          aria-label={props['aria-label'] || 'Password'}
        />
        
        {/* Password Visibility Toggle */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded p-0.5 transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {/* Caps Lock Warning */}
        {showCapsLockWarning && capsLockOn && (
          <div
            className="mt-2 flex items-start gap-1.5 text-sm text-amber-600"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>Caps Lock is on</span>
          </div>
        )}
      </div>
    );
  }
);