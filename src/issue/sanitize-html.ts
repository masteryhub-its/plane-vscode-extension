export function sanitizeIssueHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/giu, '')
    .replace(/\son\w+\s*=\s*(['"])[^'"]*\1/giu, '')
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/giu, '$1=$2$2')
    .replace(/javascript:/giu, '');
}
