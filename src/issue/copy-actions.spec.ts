import type { PlaneIssue } from '../client/plane.types';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';
import { copyActionFor } from './copy-actions';

const issue = { id: 'abcdef1234', name: 'Fix login timeout', projectIdentifier: 'ENG', sequenceId: 12 } as PlaneIssue;
const URL = 'https://plane.example/acme/browse/ENG-12/';

describe('copyActionFor', () => {
  it('copies the link', () => {
    expect(copyActionFor(IssuePanelMessageType.COPY_LINK, issue, URL)).toEqual({ text: URL, confirmation: 'Issue link copied' });
  });

  it('copies the key', () => {
    expect(copyActionFor(IssuePanelMessageType.COPY_KEY, issue, URL)).toEqual({ text: 'ENG-12', confirmation: 'Copied ENG-12' });
  });

  it('copies a branch name built from the key and title', () => {
    expect(copyActionFor(IssuePanelMessageType.COPY_BRANCH, issue, URL)).toEqual({ text: 'eng-12-fix-login-timeout', confirmation: 'Branch name copied: eng-12-fix-login-timeout' });
  });

  it('does nothing for other messages', () => {
    expect(copyActionFor(IssuePanelMessageType.RETRY, issue, URL)).toBeUndefined();
  });
});
