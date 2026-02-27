/**
 * Shared parameter-normalisation helpers for MCP tool handlers.
 */

/**
 * Normalise the `files` argument, which MCP clients may send as either a
 * JSON-encoded string or a proper string array.
 *
 * @param value - Raw value from the tool argument payload
 * @returns A normalised string array (may be empty)
 */
export function normalizeFilesParam(value: string[] | string | undefined): string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }
  return value;
}
