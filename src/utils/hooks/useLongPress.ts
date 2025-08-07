// src/utils/hooks/useLongPress.ts

import React, { useRef, useCallback } from 'react';

/**
 * Custom hook to detect long press events.
 * @param onLongPress The callback function to execute on long press.
 * @param onClick The callback function to execute on a regular click (optional).
 * @param options Configuration options for long press.
 * @param options.delay The duration in milliseconds for a press to be considered a long press (default: 500).
 */
export function useLongPress<T extends HTMLElement>(
  onLongPress: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void,
  onClick?: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void,
  { delay = 500 } = {}
) {
  // Initialize useRef with null to satisfy the 'initialValue' requirement
  // and extend the type to allow null, as a timeout reference might be null initially
  const timeout = useRef<NodeJS.Timeout | null>(null);
  // Initialize useRef with null and extend the type to allow null,
  // as the target element might not be immediately available or might be cleared
  const target = useRef<T | null>(null);

  const start = useCallback(
    (event: React.MouseEvent<T> | React.TouchEvent<T>) => {
      // Stop the event from bubbling to parent elements
      event.stopPropagation();

      // Prevent context menu on long press on some browsers
      event.preventDefault();

      target.current = event.currentTarget as T;
      timeout.current = setTimeout(() => {
        onLongPress(event);
        // Assign null instead of undefined, as the type for target.current is T | null
        target.current = null; // Clear target after long press
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: React.MouseEvent<T> | React.TouchEvent<T>, shouldClick = true) => {
      // Clear the timeout if it exists
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      if (shouldClick && onClick && target.current === event.currentTarget) {
        onClick(event);
      }
      // Assign null instead of undefined
      target.current = null;
    },
    [onClick]
  );

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: (e: React.MouseEvent<T>) => clear(e),
    onMouseLeave: (e: React.MouseEvent<T>) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent<T>) => clear(e),
    onTouchCancel: (e: React.TouchEvent<T>) => clear(e, false),
  };
}