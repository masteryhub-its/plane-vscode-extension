export function formatIssueKey(identifier: string, sequenceId: number, fallbackId: string): string {
  if (identifier.length > 0 && sequenceId > 0) {
    return `${identifier}-${sequenceId}`;
  }
  return fallbackId.slice(0, 8);
}
