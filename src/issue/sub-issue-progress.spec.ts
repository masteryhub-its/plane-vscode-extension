import { initialsOf, subIssueProgress } from './sub-issue-progress';

describe('subIssueProgress', () => {
  it('counts completed items out of all that are not cancelled', () => {
    expect(subIssueProgress([{ stateGroup: 'completed' }, { stateGroup: 'started' }, { stateGroup: 'unstarted' }, { stateGroup: 'cancelled' }])).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it('treats a missing group as not done', () => {
    expect(subIssueProgress([{}, { stateGroup: 'completed' }])).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it('is 0 of 0 with no sub-issues, without dividing by zero', () => {
    expect(subIssueProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(subIssueProgress([{ stateGroup: 'cancelled' }])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it('reaches 100 when everything is done', () => {
    expect(subIssueProgress([{ stateGroup: 'completed' }, { stateGroup: 'completed' }]).percent).toBe(100);
  });
});

describe('initialsOf', () => {
  it.each([
    ['Ada Lovelace', 'AL'],
    ['ada', 'A'],
    ['  grace  brewster   hopper ', 'GH'],
    ['ada@example.com', 'A'],
    ['', '?'],
    ['   ', '?'],
  ])('turns %j into %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
