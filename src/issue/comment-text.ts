const SIMPLE_MARKUP = /<\/?p>|<br\s*\/?>/giu;

/** True when a comment is only paragraphs, line breaks and text, so a plain-text editor can round-trip it. */
export function isPlainEditableComment(html: string): boolean {
  return !html.replace(SIMPLE_MARKUP, '').includes('<');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&amp;/gu, '&');
}

/** Plain text for the comment editor. Only meaningful when `isPlainEditableComment` is true. */
export function commentHtmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/p>\s*<p>/giu, '\n\n')
      .replace(/<br\s*\/?>/giu, '\n')
      .replace(/<\/?p>/giu, '')
  );
}

function escapePlain(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
}

/** The comment body the extension writes: blank lines start a paragraph, single newlines become line breaks. */
export function plainTextToCommentHtml(value: string): string {
  return value
    .split(/\n{2,}/u)
    .map((paragraph) => `<p>${escapePlain(paragraph).replace(/\n/gu, '<br />')}</p>`)
    .join('');
}
