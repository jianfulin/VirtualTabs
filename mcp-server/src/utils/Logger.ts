import { ErrorResponse, ErrorType, SuccessResponse } from '../types.js';

/**
 * Unified logging and error-response factory for MCP tools.
 */
export class Logger {
  /**
   * Log a tool error to stderr.
   * @param name Tool name
   * @param error Error object or message
   */
  static logError(name: string, error: unknown): void {
    console.error(`[Tool Error] ${name}:`, error instanceof Error ? error.stack : String(error));
  }

  /**
   * Create a success response.
   * @param data Response payload
   * @param message Optional success message
   */
  static createSuccess<T>(data: T, message?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      ...(message ? { message } : {}),
    };
  }

  /**
   * Create an error response.
   * @param type Error category
   * @param message Human-readable error description
   * @param suggestion Optional remediation hint
   * @param details Optional additional diagnostic info
   */
  static createError(
    type: ErrorType | string,
    message: string,
    suggestion?: string,
    details?: unknown
  ): ErrorResponse {
    return {
      success: false,
      error: {
        type,
        message,
        ...(suggestion ? { suggestion } : {}),
        ...(details ? { details } : {}),
      },
    };
  }
}
