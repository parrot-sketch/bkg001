'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'type'> {
  showCapsLockWarning?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      className,
      showCapsLockWarning = true,
      ...props
    },
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);

    const internalRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    useEffect(() => {
      const input = internalRef.current;

      if (!input) {
        return;
      }

      const handleKeyPress = (event: KeyboardEvent) => {
        if (event.getModifierState) {
          setCapsLockOn(event.getModifierState('CapsLock'));
        }
      };

      input.addEventListener('keydown', handleKeyPress);
      input.addEventListener('keyup', handleKeyPress);

      return () => {
        input.removeEventListener('keydown', handleKeyPress);
        input.removeEventListener('keyup', handleKeyPress);
      };
    }, []);

    const togglePasswordVisibility = () => {
      setShowPassword((current) => !current);

      requestAnimationFrame(() => {
        internalRef.current?.focus();
      });
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={internalRef}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'pr-11 touch-manipulation select-text',
            className,
          )}
          aria-label={props['aria-label'] || 'Password'}
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
            touchAction: 'manipulation',
            ...props.style,
          }}
        />

        <button
          type="button"
          onClick={togglePasswordVisibility}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'flex h-7 w-7 items-center justify-center',
            'rounded-md text-[#7C8795]',
            'transition-colors duration-150',
            'hover:bg-[#F1F3F5] hover:text-[#102F52]',
            'focus:outline-none focus:ring-2 focus:ring-[#102F52]/15',
          )}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff
              className="h-4 w-4"
              aria-hidden="true"
            />
          ) : (
            <Eye
              className="h-4 w-4"
              aria-hidden="true"
            />
          )}
        </button>

        {showCapsLockWarning && capsLockOn && (
          <div
            className="mt-2 flex items-start gap-1.5 text-xs text-[#9A6B20]"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />

            <span>Caps Lock is on</span>
          </div>
        )}
      </div>
    );
  },
);