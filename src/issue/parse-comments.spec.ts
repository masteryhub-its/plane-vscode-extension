import { parseComments, sanitizeCommentHtml } from './parse-comments';

describe('parseComments', () => {
  it('returns newest comments first and skips malformed rows', () => {
    expect(
      parseComments({
        results: [
          { id: 'c1', comment_html: '<p>Old</p>', created_at: '2026-01-01T00:00:00Z', actor_detail: { display_name: 'Ada' } },
          { id: 'c2', comment_html: '<p>New</p>', created_at: '2026-02-01T00:00:00Z', actor_detail: { display_name: 'Sara' } },
          { name: 'no-id' },
        ],
      })
    ).toEqual([
      { id: 'c2', html: '<p>New</p>', authorName: 'Sara', createdAt: '2026-02-01T00:00:00Z', authorId: '' },
      { id: 'c1', html: '<p>Old</p>', authorName: 'Ada', createdAt: '2026-01-01T00:00:00Z', authorId: '' },
    ]);
  });
});

describe('sanitizeCommentHtml', () => {
  it('strips script tags from comment html', () => {
    expect(sanitizeCommentHtml('<p>Hi <script>alert(1)</script></p>')).toBe('<p>Hi </p>');
  });
});
