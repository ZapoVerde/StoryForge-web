// src/utils/formatDate.ts

/**
 * Formats an ISO 8601 date string into a more human-readable local date and time.
 * @param isoString The date string in ISO 8601 format (e.g., "2023-10-27T10:00:00Z").
 * @returns A formatted date string (e.g., "October 27, 2023, 10:00 AM").
 */
export function formatIsoDateForDisplay(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // Invalid date string
      return "Invalid Date";
    }
    // Options for a readable format. Adjust as needed.
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true, // Use 12-hour clock with AM/PM
    };
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Error formatting date";
  }
}

/**
 * Converts a Firestore Timestamp-like object to an ISO string if applicable.
 * If not a Timestamp, returns the value unchanged.
 */
export function toIsoStringIfTimestamp(value: any): string {
  return value instanceof Object && 'toDate' in value
    ? value.toDate().toISOString()
    : value;
}

