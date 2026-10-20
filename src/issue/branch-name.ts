const MAX_LENGTH = 60;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/** A branch name such as `eng-12-fix-login-timeout`: the issue key first, then a short slug of the title. */
export function branchNameFor(key: string, title: string): string {
  const head = slugify(key) || 'issue';
  const room = MAX_LENGTH - head.length - 1;
  let slug = slugify(title);
  if (slug.length > room) {
    const cut = slug.slice(0, room);
    const boundary = cut.lastIndexOf('-');
    slug = boundary > 0 && slug.charAt(room) !== '-' ? cut.slice(0, boundary) : cut.replace(/-+$/u, '');
  }
  return slug.length > 0 ? `${head}-${slug}` : head;
}
