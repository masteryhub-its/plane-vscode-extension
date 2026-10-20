import { escapeHtml } from '../sidebar/escape-html';
import type { CreateIssueDraft } from './create-issue-draft';

export interface SelectionInput {
  /** Path inside the workspace; never an absolute path, so a home folder is not written into an issue. */
  readonly relativePath: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly languageId: string;
  readonly text: string;
}

const MAX_TITLE = 120;
const MAX_QUOTE = 3_000;
const COMMENT_MARKS = /^(?:\/\/+|\/\*+|\*+|#+|--|<!--|;+)\s*/u;
const COMMENT_ENDS = /\s*(?:\*\/|-->)\s*$/u;
const TASK_LABEL = /^(?:todo|fixme|bug|hack|xxx|note)\b[\s:(-]*(?:\([^)]*\))?[\s:-]*/iu;

function titleFromLine(line: string): string {
  return line.trim().replace(COMMENT_MARKS, '').replace(COMMENT_ENDS, '').replace(TASK_LABEL, '').trim();
}

function shorten(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function relative(path: string): string {
  return path.startsWith('/') || /^[a-z]:[\\/]/iu.test(path) ? (path.split(/[\\/]/u).pop() ?? path) : path;
}

/** An issue draft for a piece of code: a title from its first meaningful line, and a description saying where it is and quoting it. */
export function draftFromSelection(input: SelectionInput): CreateIssueDraft {
  const file = relative(input.relativePath);
  const first = input.text
    .split(/\r?\n/u)
    .map(titleFromLine)
    .find((line) => line.length > 0);
  const name = first === undefined ? `Follow up in ${file}` : shorten(first, MAX_TITLE);
  const where = input.endLine > input.startLine ? `lines ${input.startLine}–${input.endLine}` : `line ${input.startLine}`;
  const trimmed = input.text.replace(/\s+$/u, '');
  const quoted = shorten(trimmed, MAX_QUOTE);
  const note = trimmed.length > MAX_QUOTE ? '<p><em>Code shortened.</em></p>' : '';
  const descriptionHtml = `<p>From <code>${escapeHtml(file)}</code>, ${where}.</p><pre><code>${escapeHtml(quoted)}</code></pre>${note}`;
  return { name, descriptionHtml };
}
