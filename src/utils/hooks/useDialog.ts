// src/utils/hooks/useDialog.ts
import { useState, useCallback } from 'react';

/**
 * A custom hook to manage the state of a dialog or modal.
 * @param initialState - The initial open state of the dialog (defaults to false).
 * @returns An object with { isOpen, open, close } properties for controlling the dialog.
 */
export const useDialog = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  /**
   * Opens the dialog.
   */
  const open = useCallback(() => setIsOpen(true), []);

  /**
   * Closes the dialog.
   */
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
};