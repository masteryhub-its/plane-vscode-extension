import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'sub',
  'sup',
  'kbd',
  'mark',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'img',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'figure',
  'figcaption',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};

const MENTION_LABEL_ATTRIBUTES = ['label', 'name', 'display_name'] as const;

function mentionLabel(attribs: Readonly<Record<string, string>>): string {
  for (const key of MENTION_LABEL_ATTRIBUTES) {
    const value = attribs[key]?.trim();
    if (value !== undefined && value.length > 0) {
      return value;
    }
  }
  return 'mention';
}

// Plane's editor stores mentions, images and task items as custom elements or data attributes. They are rewritten
// to plain, allowlisted markup before the allowlist runs, so they stay visible instead of vanishing.
const TRANSFORM_TAGS: NonNullable<sanitizeHtml.IOptions['transformTags']> = {
  'mention-component': (_tagName, attribs) => ({ tagName: 'span', attribs: { class: 'mention' }, text: `@${mentionLabel(attribs)}` }),
  'image-component': () => ({ tagName: 'span', attribs: { class: 'image-placeholder' }, text: '[image]' }),
  li: (tagName, attribs) => {
    const checked = attribs['data-checked'];
    if (checked === undefined) {
      return { tagName, attribs };
    }
    return { tagName, attribs: { class: checked === 'true' ? 'task-done' : 'task-open' } };
  },
};

const ALLOWED_CLASSES: sanitizeHtml.IOptions['allowedClasses'] = {
  span: ['mention', 'image-placeholder'],
  li: ['task-done', 'task-open'],
  code: ['language-*'],
};

export function sanitizeIssueHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedClasses: ALLOWED_CLASSES,
    transformTags: TRANSFORM_TAGS,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  });
}
