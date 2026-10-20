import { branchNameFor } from './branch-name';

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
