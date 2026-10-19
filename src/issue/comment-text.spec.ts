import { commentHtmlToText, isPlainEditableComment, plainTextToCommentHtml } from './comment-text';

describe('isPlainEditableComment', () => {
  it.each(['<p>Plain text</p>', '<p>One</p><p>Two</p>', '<p>Line one<br>line two</p>', '<p>Line one<br />line two</p>', 'bare text', '<p>5 &lt; 6 &amp; 7</p>', ''])('accepts %j', (html) => {
    expect(isPlainEditableComment(html)).toBe(true);
  });

  it.each([
    '<p><strong>Bold</strong></p>',
    '<p>See <a href="https://example.com">link</a></p>',
    '<ul><li>item</li></ul>',
    '<p>Hi <mention-component entity_identifier="u1"></mention-component></p>',
    '<pre><code>x</code></pre>',
    '<p class="x">styled</p>',
    '<p><img src="a.png"></p>',
  ])('rejects %j because editing as plain text would lose formatting', (html) => {
    expect(isPlainEditableComment(html)).toBe(false);
  });
});

describe('commentHtmlToText', () => {
  it('turns paragraphs into blank-line separated text', () => {
    expect(commentHtmlToText('<p>One</p><p>Two</p>')).toBe('One\n\nTwo');
  });

  it('turns line breaks into newlines', () => {
    expect(commentHtmlToText('<p>Line one<br>line two</p>')).toBe('Line one\nline two');
  });

  it('decodes the entities the extension writes', () => {
    expect(commentHtmlToText('<p>5 &lt; 6 &amp; 7 &gt; 1</p>')).toBe('5 < 6 & 7 > 1');
  });

  it('round-trips with the writer used when posting a comment', () => {
    expect(commentHtmlToText('<p>a &amp; b</p><p>c<br />d</p>')).toBe('a & b\n\nc\nd');
  });
});

describe('plainTextToCommentHtml', () => {
  it('escapes markup and keeps paragraphs and line breaks', () => {
    expect(plainTextToCommentHtml('a <b> & c\nnext\n\nsecond')).toBe('<p>a &lt;b&gt; &amp; c<br />next</p><p>second</p>');
  });

  it('is the inverse of commentHtmlToText for text the editor produces', () => {
    const text = 'x < y & z\nline two\n\nparagraph two';
    expect(commentHtmlToText(plainTextToCommentHtml(text))).toBe(text);
    expect(isPlainEditableComment(plainTextToCommentHtml(text))).toBe(true);
  });
});
