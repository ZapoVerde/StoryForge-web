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
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<T>();

  const start = useCallback(
    (event: React.MouseEvent<T> | React.TouchEvent<T>) => {
      // Prevent context menu on long press on some browsers
      event.preventDefault();
      target.current = event.currentTarget as T;
      timeout.current = setTimeout(() => {
        onLongPress(event);
        target.current = undefined; // Clear target after long press
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: React.MouseEvent<T> | React.TouchEvent<T>, shouldClick = true) => {
      clearTimeout(timeout.current);
      if (shouldClick && onClick && target.current === event.currentTarget) {
        onClick(event);
      }
      target.current = undefined;
    },
    [onClick]
  );

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: (e: React.MouseEvent<T>) => clear(e),
    onMouseLeave: (e: React.MouseEvent<T>) => clear(e, false), // No click if mouse leaves
    onTouchEnd: (e: React.TouchEvent<T>) => clear(e),
    onTouchCancel: (e: React.TouchEvent<T>) => clear(e, false), // No click if touch cancelled
  };
}