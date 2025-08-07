// src/utils/debug.ts
import { useSettingsStore } from '../state/useSettingsStore';

/**
 * A centralized logging utility that conditionally logs messages based on a debug setting.
 * This function should be used in place of direct `console.log` for debug messages.
 * @param message The message to log.
 * @param optionalParams Any additional data to log.
 */
export const debugLog = (message?: any, ...optionalParams: any[]) => {
  const { enableDebugLogging } = useSettingsStore.getState();
  if (enableDebugLogging) {
    console.log(message, ...optionalParams);
  }
};

/**
 * A centralized error logging utility that always logs errors, regardless of debug setting.
 * @param message The error message to log.
 * @param optionalParams Any additional error data to log.
 */
export const errorLog = (message?: any, ...optionalParams: any[]) => {
  console.error(message, ...optionalParams);
};