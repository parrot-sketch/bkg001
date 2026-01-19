import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-foreground transition-all",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        "resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
