import { sanitizeIssueHtml } from './sanitize-html';

describe('sanitizeIssueHtml', () => {
  it('keeps ordinary formatting', () => {
    const html = '<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>one</li></ul><pre><code>const x = 1;</code></pre><a href="https://example.com">link</a>';
    expect(sanitizeIssueHtml(html)).toBe(html);
  });

  it('strips script tags, event handlers, and javascript urls', () => {
    expect(sanitizeIssueHtml('<p onclick="x">Hi <script>alert(1)</script><a href="javascript:alert(1)">x</a></p>')).toBe('<p>Hi <a>x</a></p>');
  });

  it('strips unquoted event handlers', () => {
    expect(sanitizeIssueHtml('<img src=x onerror=alert(1)>')).toBe('<img src="x" />');
  });

  it('strips svg onload payloads', () => {
    expect(sanitizeIssueHtml('<svg/onload=alert(1)>')).toBe('');
  });

  it('blocks entity-encoded javascript urls', () => {
    expect(sanitizeIssueHtml('<a href="jav&#x61;script:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('removes base, form, meta refresh, and iframe', () => {
    expect(sanitizeIssueHtml('<base href="https://evil.example">')).toBe('');
    expect(sanitizeIssueHtml('<form action="https://evil.example"><button>go</button></form>')).toBe('go');
    expect(sanitizeIssueHtml('<meta http-equiv="refresh" content="0;url=https://evil.example">')).toBe('');
    expect(sanitizeIssueHtml('<iframe src="https://evil.example"></iframe>')).toBe('');
  });

  it('drops style and class attributes used for ui spoofing', () => {
    expect(sanitizeIssueHtml('<p class="fake-header" style="position:fixed">x</p>')).toBe('<p>x</p>');
  });

  it('keeps only http, https, and mailto link schemes', () => {
    expect(sanitizeIssueHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('<a>x</a>');
    expect(sanitizeIssueHtml('<a href="mailto:dev@example.com">mail</a>')).toBe('<a href="mailto:dev@example.com">mail</a>');
  });

  // Shapes follow Plane's rich-text editor output. Confirm against real server HTML (spike S-06).
  describe('Plane rich content', () => {
    it('keeps a mention visible instead of dropping it', () => {
      expect(sanitizeIssueHtml('<p>Hi <mention-component entity_name="user_mention" entity_identifier="u1"></mention-component></p>')).toBe('<p>Hi <span class="mention">@mention</span></p>');
    });

    it('uses a name attribute for the mention when Plane sends one', () => {
      expect(sanitizeIssueHtml('<mention-component label="Ada" entity_identifier="u1"></mention-component>')).toBe('<span class="mention">@Ada</span>');
    });

    it('escapes a hostile mention name', () => {
      expect(sanitizeIssueHtml('<mention-component label="&lt;img src=x onerror=alert(1)&gt;"></mention-component>')).toBe('<span class="mention">@&lt;img src=x onerror=alert(1)&gt;</span>');
    });

    it('shows an image placeholder because the asset needs a Plane session to load', () => {
      expect(sanitizeIssueHtml('<image-component src="3f2a" width="200"></image-component>')).toBe('<span class="image-placeholder">[image]</span>');
    });

    it('marks task list items as done or open', () => {
      const html = '<ul data-type="taskList"><li data-checked="true">done</li><li data-checked="false">open</li></ul>';
      expect(sanitizeIssueHtml(html)).toBe('<ul><li class="task-done">done</li><li class="task-open">open</li></ul>');
    });

    it('keeps the language class on code blocks but nothing else', () => {
      expect(sanitizeIssueHtml('<pre><code class="language-ts evil">x</code></pre>')).toBe('<pre><code class="language-ts">x</code></pre>');
    });

    it('does not let a class on other tags through', () => {
      expect(sanitizeIssueHtml('<p class="mention task-done">x</p>')).toBe('<p>x</p>');
    });
  });
});
