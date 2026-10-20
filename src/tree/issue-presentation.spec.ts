import { describeDueDate, presentIssue, type PresentableIssue } from './issue-presentation';

const TODAY = new Date(2026, 8, 20); // 20 Sep 2026, local time

function issue(overrides: Partial<PresentableIssue> = {}): PresentableIssue {
  return {
    id: 'abcdef1234567890',
    name: 'Fix login timeout',
    projectIdentifier: 'ENG',
    sequenceId: 12,
    stateName: 'In Progress',
    stateGroup: 'started',
    priority: 'high',
    targetDate: undefined,
    assigneeNames: ['Ada'],
    ...overrides,
  };
}

describe('presentIssue', () => {
  it('uses the title as the label and the key as the description', () => {
    const view = presentIssue(issue(), TODAY);
    expect(view.label).toBe('Fix login timeout');
    expect(view.description).toBe('ENG-12');
  });

  it('falls back to the key when the title is empty, and to a short id when there is no key', () => {
    expect(presentIssue(issue({ name: '  ' }), TODAY).label).toBe('ENG-12');
    expect(presentIssue(issue({ projectIdentifier: '', sequenceId: 0 }), TODAY).description).toBe('abcdef12');
  });

  it.each([
    ['backlog', 'circle-outline', 'disabledForeground'],
    ['unstarted', 'circle-outline', undefined],
    ['started', 'play-circle', 'charts.yellow'],
    ['completed', 'pass-filled', 'charts.green'],
    ['cancelled', 'circle-slash', 'disabledForeground'],
  ])('shows the %s state with icon %s', (group, id, color) => {
    expect(presentIssue(issue({ stateGroup: group }), TODAY).icon).toEqual({ id, color });
  });

  it('uses a neutral icon for an unknown or missing state group', () => {
    expect(presentIssue(issue({ stateGroup: 'custom' }), TODAY).icon).toEqual({ id: 'circle-outline', color: undefined });
    expect(presentIssue(issue({ stateGroup: undefined }), TODAY).icon).toEqual({ id: 'circle-outline', color: undefined });
  });

  it.each([
    ['urgent', '!!', 'Urgent'],
    ['high', 'H', 'High'],
    ['medium', 'M', 'Medium'],
    ['low', 'L', 'Low'],
  ])('gives %s priority a badge', (priority, badge, label) => {
    const view = presentIssue(issue({ priority }), TODAY);
    expect(view.priorityBadge).toBe(badge);
    expect(view.priorityLabel).toBe(label);
  });

  it('shows no badge without a priority', () => {
    expect(presentIssue(issue({ priority: 'none' }), TODAY).priorityBadge).toBeUndefined();
    expect(presentIssue(issue({ priority: '' }), TODAY).priorityBadge).toBeUndefined();
  });

  describe('due date', () => {
    it('shows an upcoming date without a year in the current year', () => {
      const view = presentIssue(issue({ targetDate: '2026-09-25' }), TODAY);
      expect(view.description).toBe('ENG-12 · due Sep 25');
      expect(view.emphasis).toBeUndefined();
    });

    it('adds the year when it differs from this year', () => {
      expect(presentIssue(issue({ targetDate: '2027-01-05' }), TODAY).description).toBe('ENG-12 · due Jan 5, 2027');
    });

    it('treats today as not overdue', () => {
      const view = presentIssue(issue({ targetDate: '2026-09-20' }), TODAY);
      expect(view.description).toBe('ENG-12 · due Sep 20');
      expect(view.emphasis).toBeUndefined();
    });

    it('marks a past date on an open issue as overdue, in words as well as emphasis', () => {
      const view = presentIssue(issue({ targetDate: '2026-09-12' }), TODAY);
      expect(view.description).toBe('ENG-12 · overdue Sep 12');
      expect(view.emphasis).toBe('overdue');
    });

    it.each(['completed', 'cancelled'])('never marks a %s issue overdue', (group) => {
      const view = presentIssue(issue({ stateGroup: group, targetDate: '2026-01-01' }), TODAY);
      expect(view.description).toBe('ENG-12 · due Jan 1');
      expect(view.emphasis).toBeUndefined();
    });

    it('reads the date part of a full timestamp', () => {
      expect(presentIssue(issue({ targetDate: '2026-09-25T00:00:00Z' }), TODAY).description).toBe('ENG-12 · due Sep 25');
    });

    it.each(['', 'not a date', '2026-13-45', '25/09/2026'])('ignores an unusable date %j', (targetDate) => {
      expect(presentIssue(issue({ targetDate }), TODAY).description).toBe('ENG-12');
    });
  });

  it('emphasises an urgent issue that is not overdue', () => {
    expect(presentIssue(issue({ priority: 'urgent' }), TODAY).emphasis).toBe('urgent');
  });

  it('prefers overdue over urgent', () => {
    expect(presentIssue(issue({ priority: 'urgent', targetDate: '2026-09-01' }), TODAY).emphasis).toBe('overdue');
  });

  it('writes a plain-text tooltip with state, priority, assignees and due date', () => {
    const view = presentIssue(issue({ targetDate: '2026-09-12', assigneeNames: ['Ada', 'Sara'] }), TODAY);
    expect(view.tooltip).toEqual(['ENG-12 Fix login timeout', 'State: In Progress', 'Priority: High', 'Assignees: Ada, Sara', 'Due: Sep 12 (overdue)']);
  });

  it('says Unassigned and omits the due line when there is none', () => {
    const view = presentIssue(issue({ assigneeNames: [], priority: 'none' }), TODAY);
    expect(view.tooltip).toEqual(['ENG-12 Fix login timeout', 'State: In Progress', 'Assignees: Unassigned']);
  });
});

describe('describeDueDate', () => {
  it('returns text and the overdue flag', () => {
    expect(describeDueDate('2026-09-12', 'started', TODAY)).toEqual({ text: 'Sep 12', overdue: true });
    expect(describeDueDate('2026-09-30', 'started', TODAY)).toEqual({ text: 'Sep 30', overdue: false });
    expect(describeDueDate('2026-09-12', 'completed', TODAY)).toEqual({ text: 'Sep 12', overdue: false });
  });

  it('returns nothing without a usable date', () => {
    expect(describeDueDate(undefined, 'started', TODAY)).toBeUndefined();
    expect(describeDueDate('soon', 'started', TODAY)).toBeUndefined();
  });
});
