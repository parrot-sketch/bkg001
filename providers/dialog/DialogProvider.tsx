'use client';

/**
 * Presentation Layer — DialogProvider
 *
 * Owns all consultation dialog visibility state:
 * - Complete consultation dialog
 * - Start consultation dialog
 *
 * This provider is purely presentational.
 * It does not perform workflow transitions, business validation,
 * or any side effects beyond visibility toggling.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface DialogContextState {
  isCompleteDialogOpen: boolean;
  isStartDialogOpen: boolean;
}

interface DialogContextValue extends DialogContextState {
  openCompleteDialog: () => void;
  closeCompleteDialog: () => void;
  openStartDialog: () => void;
  closeStartDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [isCompleteDialogOpen, setCompleteDialogOpen] = useState(false);
  const [isStartDialogOpen, setStartDialogOpen] = useState(false);

  const openCompleteDialog = useCallback(() => setCompleteDialogOpen(true), []);
  const closeCompleteDialog = useCallback(() => setCompleteDialogOpen(false), []);
  const openStartDialog = useCallback(() => setStartDialogOpen(true), []);
  const closeStartDialog = useCallback(() => setStartDialogOpen(false), []);

  const value = useMemo(() => ({
    isCompleteDialogOpen,
    isStartDialogOpen,
    openCompleteDialog,
    closeCompleteDialog,
    openStartDialog,
    closeStartDialog,
  }), [isCompleteDialogOpen, isStartDialogOpen, openCompleteDialog, closeCompleteDialog, openStartDialog, closeStartDialog]);

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialogContext must be used within DialogProvider');
  }
  return context;
}
