export const ARCHIVE_CONFIRM_ACTION = 'Archive';
export const DELETE_CONFIRM_ACTION = 'Delete issue';
export const OVERWRITE_CONFIRM_ACTION = 'Update';

export function isArchiveConfirmed(choice: string | undefined): boolean {
  return choice === ARCHIVE_CONFIRM_ACTION;
}

export function isDeleteConfirmed(choice: string | undefined): boolean {
  return choice === DELETE_CONFIRM_ACTION;
}

export function isOverwriteConfirmed(choice: string | undefined): boolean {
  return choice === OVERWRITE_CONFIRM_ACTION;
}
