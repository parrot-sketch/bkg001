import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-foreground transition-all",
          "placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Mobile-specific fixes for touch interaction
          "touch-manipulation",
          "[-webkit-appearance:none] [appearance:none]",
          "select-text",
          className
        )}
        ref={ref}
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
          touchAction: 'manipulation',
          ...props.style,
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
