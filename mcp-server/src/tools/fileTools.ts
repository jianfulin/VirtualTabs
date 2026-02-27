import { FileManager } from '../managers/FileManager.js';
import { ErrorType, ToolResponse } from '../types.js';
import { Logger } from '../utils/Logger.js';
import { normalizeFilesParam } from '../utils/normalizeParams.js';

/**
 * File operation tools
 */
export class FileTools {
  constructor(private fileManager: FileManager) {}

  /**
   * Add multiple files to a group
   */
  async addFilesToGroup(args: { groupId: string, files: string[] | string }): Promise<ToolResponse<{ added: string[], skipped: string[], invalid: string[] }>> {
    try {
      const { groupId } = args;
      // Compatible with MCP clients that send files as a string (try JSON.parse or wrap in single-element array)
      const files = normalizeFilesParam(args.files);
      if (!groupId || files.length === 0) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, 'Please provide a valid groupId and a non-empty files array');
      }

      const result = this.fileManager.addFilesToGroup(groupId, files);
      return Logger.createSuccess(
        result,
        `Added ${result.added.length} file(s), skipped ${result.skipped.length} existing, ignored ${result.invalid.length} invalid path(s)`
      );
    } catch (error) {
      Logger.logError('add_files_to_group', error);
      
      if (error instanceof Error && error.message.includes('does not exist')) {
        return Logger.createError(ErrorType.NOT_FOUND, error.message);
      }
      
      return Logger.createError(ErrorType.INTERNAL_ERROR, `Failed to add files: ${error}`);
    }
  }

  /**
   * Remove multiple files from a group
   */
  async removeFilesFromGroup(args: { groupId: string, files: string[] | string }): Promise<ToolResponse<{ removed: string[], notFound: string[] }>> {
    try {
      const { groupId } = args;
      // Compatible with MCP clients that send files as a string
      const files = normalizeFilesParam(args.files);
      if (!groupId || files.length === 0) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, 'Please provide a valid groupId and a non-empty files array');
      }

      const result = this.fileManager.removeFilesFromGroup(groupId, files);
      return Logger.createSuccess(
        result,
        `Removed ${result.removed.length} file(s), ${result.notFound.length} not found`
      );
    } catch (error) {
      Logger.logError('remove_files_from_group', error);
      
      if (error instanceof Error && error.message.includes('does not exist')) {
        return Logger.createError(ErrorType.NOT_FOUND, error.message);
      }
      
      return Logger.createError(ErrorType.INTERNAL_ERROR, `Failed to remove files: ${error}`);
    }
  }
}
