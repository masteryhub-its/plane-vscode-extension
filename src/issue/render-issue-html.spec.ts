import type { PlaneIssue } from '../client/plane.types';
import { PlaneRelationType } from '../utils/enums/plane-relation-type.enum';
import type { PlaneComment } from './parse-comments';
import { renderIssuePreviewHtml } from './render-issue-html';

describe('renderIssuePreviewHtml', () => {
  const issue: PlaneIssue = {
    id: 'issue-1',
    name: 'Fix <script>',
    descriptionHtml: '<p>Hello <script>alert(1)</script></p>',
    descriptionPlain: '',
    sequenceId: 9,
    projectId: 'proj-1',
    workspaceSlug: 'acme',
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
      today: new Date(2026, 8, 20),
    });
    expect(html).toContain('Sep 1');
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
    expect(html).toContain('Activity');
  });

  it('forbids base and form targets in the content security policy', () => {
    const html = renderIssuePreviewHtml({ issue, nonce: 'n', cspSource: 'vscode-webview://test', planeUrl: 'https://plane.test/browse/MH-9/', ...emptyExtras });
    expect(html).toContain("base-uri 'none'");
    expect(html).toContain("form-action 'none'");
    expect(html).not.toContain('window.prompt');
  });

  describe('comment editing', () => {
    const base = { issue, nonce: 'n', cspSource: 'vscode-webview://test', planeUrl: 'https://plane.test/browse/MH-9/', ...emptyExtras };
    const comment = (html: string, authorId: string): PlaneComment => ({ id: 'c1', html, authorName: 'Ada', createdAt: '2026-02-01', authorId });

    it('offers Edit with the plain text of a simple comment you wrote', () => {
      const html = renderIssuePreviewHtml({ ...base, comments: [comment('<p>one</p><p>two &amp; three</p>', 'u1')] });
      expect(html).toContain('class="comment-edit"');
      expect(html).toContain('data-text="one\n\ntwo &amp; three"');
    });

    it('does not offer Edit for a formatted comment, and says why', () => {
      const html = renderIssuePreviewHtml({ ...base, comments: [comment('<p><strong>bold</strong></p>', 'u1')] });
      expect(html).not.toContain('class="comment-edit"');
      expect(html).toContain('Edit in Plane to keep formatting');
    });

    it('offers nothing on someone else’s comment', () => {
      const html = renderIssuePreviewHtml({ ...base, comments: [comment('<p>hi</p>', 'u2')] });
      expect(html).not.toContain('class="comment-edit"');
      expect(html).not.toContain('Edit in Plane');
    });
  });

  describe('layout', () => {
    const rich: PlaneIssue = {
      ...issue,
      name: 'Fix login timeout',
      stateName: 'In Progress',
      stateGroup: 'started',
      priority: 'high',
      assigneeNames: ['Ada Lovelace'],
      assigneeIds: ['u1'],
      targetDate: '2026-09-12',
      labelNames: ['bug'],
      labelIds: ['lab-1'],
      updatedAt: '2026-09-09T09:42:00Z',
    };
    const base = {
      issue: rich,
      nonce: 'n',
      cspSource: 'vscode-webview://test',
      planeUrl: 'https://plane.test/acme/browse/MH-9/',
      ...emptyExtras,
      labels: [{ id: 'lab-1', name: 'bug', color: '#d9534f' }],
      today: new Date(2026, 8, 20),
    };
    const html = renderIssuePreviewHtml(base);

    it('shows where the issue lives, its key and its title as the page heading', () => {
      expect(html).toContain('class="crumb"');
      expect(html).toContain('acme');
      expect(html).toContain('<p class="key">MH-9</p>');
      expect(html).toContain('<h1 class="title">Fix login timeout</h1>');
    });

    it('puts the actions in one toolbar', () => {
      expect(html).toContain('role="toolbar"');
      expect(html).toContain('id="open-plane"');
      for (const type of ['changeState', 'changeAssignee', 'copyLink', 'copyKey', 'copyBranch']) {
        expect(html).toContain(`data-message="${type}"`);
      }
    });

    it('lists the properties in a side panel with icons, avatars and an overdue flag', () => {
      expect(html).toContain('class="props"');
      expect(html).toContain('In Progress');
      expect(html).toContain('High');
      expect(html).toContain('Ada Lovelace');
      expect(html).toContain('>AL<');
      expect(html).toContain('Sep 12');
      expect(html).toContain('overdue');
    });

    it('draws a label chip with readable text on its own colour', () => {
      expect(html).toContain('--chip:#d9534f');
      expect(html).toContain('--chip-fg:#000000');
    });

    it('says Unassigned and shows no due date when there are none', () => {
      const bare = renderIssuePreviewHtml({ ...base, issue: { ...rich, assigneeNames: [], assigneeIds: [], targetDate: undefined, labelNames: [], labelIds: [] } });
      expect(bare).toContain('Unassigned');
      expect(bare).not.toContain('overdue');
      expect(bare).toContain('No due date');
    });

    it('shows sub-issue progress and a state icon per row', () => {
      const done = { ...rich, id: 'c1', name: 'Done child', sequenceId: 10, stateGroup: 'completed' };
      const open = { ...rich, id: 'c2', name: 'Open child', sequenceId: 11, stateGroup: 'started' };
      const withSubs = renderIssuePreviewHtml({ ...base, subIssues: [done, open] });
      expect(withSubs).toContain('1 of 2');
      expect(withSubs).toContain('style="width:50%"');
      expect(withSubs).toContain('MH-10');
      expect(withSubs).toContain('class="icon"');
    });

    it('omits empty sections instead of showing empty headings', () => {
      expect(html).not.toContain('>Sub-issues');
      expect(html).not.toContain('>Relations');
      expect(html).not.toContain('>Attachments');
    });

    it('has an activity section with a labelled composer and a send shortcut hint', () => {
      expect(html).toContain('id="comment-form"');
      expect(html).toContain('for="comment-body"');
      expect(html).toContain('Ctrl');
      expect(html).toContain('Comment</button>');
    });

    it('escapes everything that comes from the server', () => {
      const hostile = renderIssuePreviewHtml({ ...base, issue: { ...rich, name: '<img src=x onerror=alert(1)>', assigneeNames: ['<b>x</b>'], stateName: '<i>s</i>' } });
      expect(hostile).not.toContain('<img src=x');
      expect(hostile).not.toContain('<b>x</b>');
      expect(hostile).not.toContain('<i>s</i>');
    });

    it('uses no hard-coded colours in markup other than label chips', () => {
      const withoutChips = html.replace(/--chip(-fg)?:#[0-9a-fA-F]{3,8}/gu, '');
      expect(withoutChips).not.toMatch(/#[0-9a-fA-F]{6}\b/u);
    });
  });
});
