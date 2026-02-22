'use client';

import { useState, useCallback, useRef } from 'react';

export function useUndoRedo<T>(initialState: T) {
  const [currentState, setCurrentState] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const positionRef = useRef(0);

  const undo = useCallback(() => {
    if (positionRef.current > 0) {
      positionRef.current -= 1;
      setCurrentState(historyRef.current[positionRef.current]);
      return true;
    }
    return false;
  }, []);

  const redo = useCallback(() => {
    if (positionRef.current < historyRef.current.length - 1) {
      positionRef.current += 1;
      setCurrentState(historyRef.current[positionRef.current]);
      return true;
    }
    return false;
  }, []);

  const setState = useCallback((newState: T) => {
    // Remove any states after current position (when we undo then make a change)
    historyRef.current = historyRef.current.slice(0, positionRef.current + 1);
    
    // Add new state
    historyRef.current.push(newState);
    positionRef.current = historyRef.current.length - 1;
    
    // Limit history to 50 states
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      positionRef.current -= 1;
    }
    
    setCurrentState(newState);
  }, []);

  const canUndo = positionRef.current > 0;
  const canRedo = positionRef.current < historyRef.current.length - 1;

  return {
    state: currentState,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
