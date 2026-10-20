import { draftFromSelection } from './draft-from-selection';

const base = { relativePath: 'src/app/login.ts', startLine: 12, endLine: 14, languageId: 'typescript' };

describe('draftFromSelection', () => {
  it('uses the first meaningful line as the title, without comment marks or a TODO label', () => {
    expect(draftFromSelection({ ...base, text: '// TODO: handle expired sessions\nconst x = 1;' }).name).toBe('handle expired sessions');
    expect(draftFromSelection({ ...base, text: '  # FIXME retry on 502' }).name).toBe('retry on 502');
    expect(draftFromSelection({ ...base, text: '/* NOTE: slow path */' }).name).toBe('slow path');
    expect(draftFromSelection({ ...base, text: '<!-- TODO: add alt text -->' }).name).toBe('add alt text');
  });

  it('skips blank lines and falls back to the file when there is no text to use', () => {
    expect(draftFromSelection({ ...base, text: '\n\n  parse the header  \n' }).name).toBe('parse the header');
    expect(draftFromSelection({ ...base, text: '   \n ' }).name).toBe('Follow up in src/app/login.ts');
    expect(draftFromSelection({ ...base, text: '//' }).name).toBe('Follow up in src/app/login.ts');
  });

  it('keeps the title short', () => {
    const name = draftFromSelection({ ...base, text: `word ${'x'.repeat(300)}` }).name;
    expect(name.length).toBeLessThanOrEqual(120);
    expect(name.endsWith('…')).toBe(true);
  });

  it('describes where the code is and quotes it, with everything escaped', () => {
    const html = draftFromSelection({ ...base, text: 'if (a < b && c) {}' }).descriptionHtml;
    expect(html).toContain('<code>src/app/login.ts</code>');
    expect(html).toContain('lines 12–14');
    expect(html).toContain('<pre><code>if (a &lt; b &amp;&amp; c) {}</code></pre>');
    expect(html).not.toContain('<b');
  });

  it('says "line" for a single line', () => {
    expect(draftFromSelection({ ...base, endLine: 12, text: 'x' }).descriptionHtml).toContain('line 12');
    expect(draftFromSelection({ ...base, endLine: 12, text: 'x' }).descriptionHtml).not.toContain('lines');
  });

  it('quotes at most a few thousand characters and says so', () => {
    const html = draftFromSelection({ ...base, text: 'a'.repeat(10_000) }).descriptionHtml;
    expect(html.length).toBeLessThan(5_000);
    expect(html).toContain('shortened');
  });

  it('never includes an absolute path', () => {
    expect(draftFromSelection({ ...base, relativePath: '/home/someone/app/x.ts', text: 'x' }).descriptionHtml).not.toContain('/home/someone');
  });
});
