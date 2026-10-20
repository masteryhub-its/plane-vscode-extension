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

const KEY_IN_BRANCH = /(?:^|[/_-])([a-z][a-z0-9]{1,9}-\d{1,6})(?=$|[/_-])/iu;

/** The issue key a branch was named after (see branchNameFor), or undefined for branches such as main or release/1.2.3. */
export function issueKeyFromBranch(branch: string): string | undefined {
  const match = KEY_IN_BRANCH.exec(branch);
  const key = match?.[1];
  if (key === undefined || /^(?:fix|v\d*|release|feature|bug|hotfix|rc|beta|alpha)-/iu.test(key)) {
    return undefined;
  }
  return key.toUpperCase();
}

/** An explanation when `name` could not be a git branch name, or undefined when it can. */
export function validateBranchName(name: string): string | undefined {
  const value = name.trim();
  if (value.length === 0) {
    return 'Enter a branch name';
  }
  if (/[\s~^:?*[\\]/u.test(value) || value.includes('..') || value.includes('//') || value.includes('@{') || value === '@') {
    return 'A branch name cannot contain spaces or any of ~ ^ : ? * [ \\ .. // @{';
  }
  if (value.startsWith('-') || value.startsWith('/') || value.endsWith('/') || value.endsWith('.') || value.endsWith('.lock')) {
    return 'A branch name cannot start with - or /, or end with / . or .lock';
  }
  return undefined;
}
