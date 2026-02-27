import { ProjectExplorer, ExploreOptions } from '../managers/ProjectExplorer.js';
import { ErrorType, ToolResponse } from '../types.js';
import { Logger } from '../utils/Logger.js';

export class ProjectTools {
  constructor(private projectExplorer: ProjectExplorer) {}

  /**
   * Explore project file structure
   */
  async exploreProject(args: ExploreOptions): Promise<ToolResponse<{ files: string[], count: number, truncated: boolean }>> {
    try {
      // Validate types
      const options: ExploreOptions = {
        pattern: typeof args.pattern === 'string' ? args.pattern : undefined,
        extension: typeof args.extension === 'string' ? args.extension : undefined,
        directory: typeof args.directory === 'string' ? args.directory : undefined,
        maxResults: typeof args.maxResults === 'number' ? args.maxResults : 100
      };

      const result = await this.projectExplorer.exploreProject(options);
      return Logger.createSuccess({
        files: result.files,
        count: result.files.length,
        truncated: result.truncated
      }, `Explored project, found ${result.files.length} file(s)${result.truncated ? ' (results truncated)' : ''}`);
    } catch (error) {
      Logger.logError('explore_project', error);
      
      if (error instanceof Error && error.message.includes('outside the workspace')) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, error.message);
      }
      
      return Logger.createError(ErrorType.INTERNAL_ERROR, `Error exploring project: ${error}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(args: { filePath: string }): Promise<ToolResponse<{ path: string, content: string, size: number, truncated: boolean }>> {
    try {
      const { filePath } = args;
      if (!filePath || typeof filePath !== 'string') {
        return Logger.createError(ErrorType.VALIDATION_ERROR, 'Please provide a valid filePath');
      }

      const result = this.projectExplorer.readFile(filePath);
      return Logger.createSuccess(
        result, 
        `Successfully read file${result.truncated ? ' (content > 100KB, truncated)' : ''}`
      );
    } catch (error) {
      Logger.logError('read_file', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      if (errMsg.includes('outside the workspace') || errMsg.includes('not supported') || errMsg.includes('is not a file')) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, errMsg);
      }
      
      if (errMsg.includes('does not exist')) {
        return Logger.createError(ErrorType.NOT_FOUND, errMsg);
      }

      return Logger.createError(ErrorType.IO_ERROR, `Failed to read file: ${errMsg}`);
    }
  }
}
