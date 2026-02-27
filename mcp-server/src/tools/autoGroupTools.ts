import { AutoGrouper } from '../managers/AutoGrouper.js';
import { ErrorType, ToolResponse, SortCriteria } from '../types.js';
import { Logger } from '../utils/Logger.js';

export class AutoGroupTools {
  constructor(private autoGrouper: AutoGrouper) {}

  /**
   * Set sorting criteria for a group
   */
  async setGroupSorting(args: {
    groupId: string,
    sortBy: SortCriteria,
    sortOrder: 'asc' | 'desc'
  }): Promise<ToolResponse<{ groupId: string, sortBy: SortCriteria, sortOrder: 'asc' | 'desc' }>> {
    try {
      const { groupId, sortBy, sortOrder } = args;
      if (!groupId || !sortBy || !sortOrder) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, 'Arguments groupId, sortBy, and sortOrder are all required');
      }

      this.autoGrouper.setGroupSorting(groupId, sortBy, sortOrder);

      return Logger.createSuccess({
        groupId,
        sortBy,
        sortOrder
      }, `Successfully set group sorting to ${sortBy} (${sortOrder})`);
    } catch (error) {
      Logger.logError('set_group_sorting', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      if (errMsg.includes('does not exist')) {
        return Logger.createError(ErrorType.NOT_FOUND, errMsg);
      }
      return Logger.createError(ErrorType.INTERNAL_ERROR, `Failed to set group sorting: ${errMsg}`);
    }
  }

  /**
   * Auto-create subgroups by file extension
   */
  async autoGroupByExtension(args: { groupId: string }): Promise<ToolResponse<{
    sourceGroupId: string,
    createdGroups: Array<{ id: string, name: string, extension: string, fileCount: number }>,
    totalCreated: number
  }>> {
    try {
      const { groupId } = args;
      if (!groupId) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, 'Argument groupId is required');
      }

      const result = this.autoGrouper.groupByExtension(groupId);

      return Logger.createSuccess({
        sourceGroupId: groupId,
        createdGroups: result.groups,
        totalCreated: result.created
      }, `Successfully created ${result.created} subgroups by extension`);
    } catch (error) {
      Logger.logError('auto_group_by_extension', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      if (errMsg.includes('does not exist')) {
        return Logger.createError(ErrorType.NOT_FOUND, errMsg);
      }
      if (errMsg.includes('empty')) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, errMsg);
      }
      return Logger.createError(ErrorType.INTERNAL_ERROR, `Failed to auto-group by extension: ${errMsg}`);
    }
  }

  /**
   * Auto-create subgroups by modification date
   */
  async autoGroupByDate(args: { groupId: string }): Promise<ToolResponse<{
    sourceGroupId: string,
    createdGroups: Array<{ id: string, name: string, dateGroup: string, fileCount: number }>,
    totalCreated: number
  }>> {
    try {
      const { groupId } = args;
      if (!groupId) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, 'Argument groupId is required');
      }

      const result = this.autoGrouper.groupByDate(groupId);

      return Logger.createSuccess({
        sourceGroupId: groupId,
        createdGroups: result.groups,
        totalCreated: result.created
      }, `Successfully created ${result.created} subgroups by date`);
    } catch (error) {
      Logger.logError('auto_group_by_date', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      if (errMsg.includes('does not exist')) {
        return Logger.createError(ErrorType.NOT_FOUND, errMsg);
      }
      if (errMsg.includes('empty')) {
        return Logger.createError(ErrorType.VALIDATION_ERROR, errMsg);
      }
      return Logger.createError(ErrorType.INTERNAL_ERROR, `Failed to auto-group by date: ${errMsg}`);
    }
  }
}
