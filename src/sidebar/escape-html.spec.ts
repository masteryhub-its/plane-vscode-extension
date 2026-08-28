import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>"\'&</script>')).toBe('&lt;script&gt;&quot;&#39;&amp;&lt;/script&gt;');
  });
});
