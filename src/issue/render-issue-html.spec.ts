import type { PlaneIssue } from '../client/plane.types';
import { PlaneRelationType } from '../utils/enums/plane-relation-type.enum';
import { renderIssuePreviewHtml } from './render-issue-html';

describe('renderIssuePreviewHtml', () => {
  const issue: PlaneIssue = {
    id: 'issue-1',
    name: 'Fix <script>',
    descriptionHtml: '<p>Hello <script>alert(1)</script></p>',
    descriptionPlain: '',
    sequenceId: 9,
    projectId: 'proj-1',
    workspaceSlug: 'masteryhub-its',
    projectIdentifier: 'MH',
    stateId: 'state-1',
    stateName: 'Todo',
    priority: 'high',
    assigneeIds: [],
    assigneeNames: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    targetDate: undefined,
    createdById: undefined,
    parentId: undefined,
    labelIds: [],
    labelNames: [],
  };

  const emptyExtras = {
    comments: [] as const,
    subIssues: [] as const,
    attachments: [] as const,
    relations: [] as const,
    worklogs: [] as const,
    labels: [] as const,
    currentUserId: 'u1',
  };

  it('escapes title and strips script tags from description', () => {
    const html = renderIssuePreviewHtml({
      issue,
      nonce: 'nonce',
      cspSource: 'vscode-webview://test',
      planeUrl: 'https://plane.test/browse/MH-9/',
      ...emptyExtras,
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('img-src vscode-webview://test;');
  });

  it('shows due date, label chips, comments, sub-issues, attachments, and relations', () => {
    const html = renderIssuePreviewHtml({
      issue: { ...issue, targetDate: '2026-09-01', labelNames: ['bug'], labelIds: ['lab-1'] },
      nonce: 'n2',
      cspSource: 'vscode-webview://test',
      planeUrl: 'https://plane.test/browse/MH-9/',
      comments: [{ id: 'c1', html: '<p>Hi <script>x</script></p>', authorName: 'Ada', createdAt: '2026-02-01', authorId: 'u1' }],
      subIssues: [{ ...issue, id: 'child-1', name: 'Child', sequenceId: 10 }],
      attachments: [{ id: 'att-1', name: 'spec.pdf', url: 'https://plane.test/files/spec.pdf' }],
      relations: [{ id: 'rel-1', type: PlaneRelationType.BLOCKED_BY, issueId: 'other', name: 'Blocker', key: 'MH-1' }],
      worklogs: [{ id: 'w1', duration: '1h', description: 'Debug' }],
      labels: [{ id: 'lab-1', name: 'bug', color: '#ff0000' }],
      currentUserId: 'u1',
    });
    expect(html).toContain('2026-09-01');
    expect(html).toContain('bug');
    expect(html).toContain('--chip:#ff0000');
    expect(html).toContain('Ada');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('MH-10');
    expect(html).toContain('Child');
    expect(html).toContain('spec.pdf');
    expect(html).toContain('Blocked by');
    expect(html).toContain('MH-1');
    expect(html).toContain('1h');
    expect(html).toContain('Edit');
    expect(html).toContain('Comments');
  });
});
