/**
 * UI and Utility Functions
 * 
 * This file exports UI utilities and re-exports all business logic utilities
 * from lib/utils/index.ts for convenience.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// UI utility function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export all utilities from lib/utils/index.ts
export * from "./utils/index"
