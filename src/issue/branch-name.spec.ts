import { branchNameFor, issueKeyFromBranch, validateBranchName } from './branch-name';

describe('branchNameFor', () => {
  it('joins the lowercase key and a slug of the title', () => {
    expect(branchNameFor('ENG-12', 'Fix login timeout')).toBe('eng-12-fix-login-timeout');
  });

  it('drops punctuation, accents and repeated separators', () => {
    expect(branchNameFor('ENG-12', '  Café: fix  "login" (v2) / retry!! ')).toBe('eng-12-cafe-fix-login-v2-retry');
  });

  it('keeps the branch short without cutting a word in half', () => {
    const name = branchNameFor('ENG-12', 'Make the very long synchronisation of every workspace project reliable again today');
    expect(name.length).toBeLessThanOrEqual(60);
    expect(name.endsWith('-')).toBe(false);
    expect(name.startsWith('eng-12-make-the-very-long')).toBe(true);
  });

  it('uses just the key when the title has nothing usable', () => {
    expect(branchNameFor('ENG-12', '')).toBe('eng-12');
    expect(branchNameFor('ENG-12', '日本語 !!!')).toBe('eng-12');
  });

  it('only ever produces characters a branch name can hold', () => {
    expect(branchNameFor('ENG-12', 'a/b\\c..d~e^f:g?h*i[j')).toMatch(/^[a-z0-9-]+$/u);
  });
});

describe('issueKeyFromBranch', () => {
  it.each([
    ['eng-12-fix-login', 'ENG-12'],
    ['feature/eng-12-fix-login', 'ENG-12'],
    ['bugfix/MH-345_retry', 'MH-345'],
    ['ENG-7', 'ENG-7'],
    ['users/me/web2-9-title', 'WEB2-9'],
  ])('finds the key in %s', (branch, key) => {
    expect(issueKeyFromBranch(branch)).toBe(key);
  });

  it.each(['main', 'develop', 'release/1.2.3', 'feature/login', 'fix-2024-01-bug', 'v2-3', 'HEAD', ''])('finds no key in %s', (branch) => {
    expect(issueKeyFromBranch(branch)).toBeUndefined();
  });
});

describe('validateBranchName', () => {
  it.each(['eng-12-fix', 'feature/eng-12', 'a.b'])('accepts %s', (name) => {
    expect(validateBranchName(name)).toBeUndefined();
  });

  it.each(['', '  ', 'has space', 'a..b', '-lead', '/lead', 'trail/', 'x.lock', 'trail.', 'a~b', 'a^b', 'a:b', 'a?b', 'a*b', 'a[b', 'a\\b', 'a//b', '@'])('rejects %p', (name) => {
    expect(validateBranchName(name)).toEqual(expect.any(String));
  });
});
