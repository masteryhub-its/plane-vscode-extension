import { ARCHIVE_CONFIRM_ACTION, DELETE_CONFIRM_ACTION, isArchiveConfirmed, isDeleteConfirmed } from './confirm-issue-action';

describe('confirm-issue-action', () => {
  it('accepts the archive action only', () => {
    expect(isArchiveConfirmed(ARCHIVE_CONFIRM_ACTION)).toBe(true);
    expect(isArchiveConfirmed('Cancel')).toBe(false);
  });

  it('accepts the delete action only', () => {
    expect(isDeleteConfirmed(DELETE_CONFIRM_ACTION)).toBe(true);
    expect(isDeleteConfirmed(ARCHIVE_CONFIRM_ACTION)).toBe(false);
  });
});
