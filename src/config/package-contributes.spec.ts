import contributes from '../../package.json';

describe('package contributes', () => {
  it('registers plane views and commands', () => {
    expect(contributes.contributes.views.plane).toHaveLength(2);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.search')).toBe(true);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.copyIssueKey')).toBe(true);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.archiveIssue')).toBe(true);
    expect(contributes.contributes.commands.some((command) => command.command === 'plane.convertIntake')).toBe(true);
    expect(contributes.name).toBe('plane');
    expect(contributes.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/u);
    expect(contributes.publisher).toBe('MasteryHubITS');
  });

  const commandIds = new Set(contributes.contributes.commands.map((command) => command.command));
  const titleMenu = contributes.contributes.menus['view/title'];

  it('shows the native issues tree and hides the old webview panel unless asked for', () => {
    const views = contributes.contributes.views.plane as readonly { id: string; when?: string }[];
    const explorer = views.find((view) => view.id === 'planeExplorer');
    const panel = views.find((view) => view.id === 'planePanel');
    expect(explorer?.when).toBeUndefined();
    expect(panel?.when).toBe('config.plane.ui.legacySidebar');
    const setting = contributes.contributes.configuration.properties['plane.ui.legacySidebar'];
    expect(setting.default).toBe(false);
  });

  it('offers a welcome view with sign in and server choice when signed out', () => {
    const welcome = contributes.contributes.viewsWelcome as readonly { view: string; contents: string; when: string }[];
    const entry = welcome.find((item) => item.view === 'planeExplorer');
    expect(entry?.when).toBe('!plane.signedIn');
    expect(entry?.contents).toContain('command:plane.openSignIn');
    expect(entry?.contents).toContain('command:plane.setServerUrl');
  });

  it('keeps the title bar to three icons and moves the rest into the more menu', () => {
    const explorer = titleMenu.filter((item) => item.when.includes('planeExplorer'));
    const icons = explorer.filter((item) => item.group.startsWith('navigation')).map((item) => item.command);
    const more = explorer.filter((item) => !item.group.startsWith('navigation')).map((item) => item.command);
    expect(icons).toEqual(['plane.search', 'plane.createIssue', 'plane.refresh']);
    expect(more).toEqual(expect.arrayContaining(['plane.forceReload', 'plane.setServerUrl', 'plane.exportPatToMcpEnv', 'plane.signOut']));
  });

  it('only references commands that are contributed', () => {
    for (const item of titleMenu) {
      expect(commandIds.has(item.command)).toBe(true);
    }
    const welcome = contributes.contributes.viewsWelcome as readonly { contents: string }[];
    for (const match of welcome.flatMap((item) => [...item.contents.matchAll(/command:([A-Za-z.]+)/gu)])) {
      expect(commandIds.has(match[1] ?? '')).toBe(true);
    }
  });
});
