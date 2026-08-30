import contributes from '../../package.json';

describe('package contributes', () => {
  it('registers plane views and commands', () => {
    expect(contributes.contributes.views.plane).toHaveLength(2);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.search')).toBe(true);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.copyIssueKey')).toBe(true);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.archiveIssue')).toBe(true);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.convertIntake')).toBe(true);
    expect(contributes.name).toBe('plane');
    expect(contributes.version).toBe('0.5.2');
  });
});
