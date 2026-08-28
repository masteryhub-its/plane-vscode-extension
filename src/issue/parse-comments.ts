export interface PlaneComment {
  readonly id: string;
  readonly html: string;
  readonly authorName: string;
  readonly createdAt: string;
  readonly authorId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseComment(raw: unknown): PlaneComment | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  const actor = raw['actor_detail'];
  const authorName = isRecord(actor) ? readString(actor['display_name']) || readString(actor['email']) : '';
  const authorId = isRecord(actor) ? readString(actor['id']) : readString(raw['actor']);
  return {
    id,
    html: readString(raw['comment_html']) || readString(raw['comment']),
    authorName: authorName.length > 0 ? authorName : 'Unknown',
    createdAt: readString(raw['created_at']),
    authorId,
  };
}

export function parseComments(raw: unknown): readonly PlaneComment[] {
  const items = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw['results']) ? raw['results'] : [];
  const comments = items.map(parseComment).filter((comment): comment is PlaneComment => comment !== undefined);
  return [...comments].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export { sanitizeIssueHtml as sanitizeCommentHtml } from './sanitize-html';
