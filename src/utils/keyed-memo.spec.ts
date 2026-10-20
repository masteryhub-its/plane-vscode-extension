import { createKeyedMemo } from './keyed-memo';

describe('createKeyedMemo', () => {
  it('loads once for the same key, even for calls made at the same time', async () => {
    const memo = createKeyedMemo<string>();
    let loads = 0;
    const load = (): Promise<string> => {
      loads += 1;
      return Promise.resolve('value');
    };
    expect(await Promise.all([memo('a', load), memo('a', load), memo('a', load)])).toEqual(['value', 'value', 'value']);
    await memo('a', load);
    expect(loads).toBe(1);
  });

  it('loads again when the key changes, for example after signing in as someone else', async () => {
    const memo = createKeyedMemo<string>();
    expect(await memo('user-1', () => Promise.resolve('one'))).toBe('one');
    expect(await memo('user-2', () => Promise.resolve('two'))).toBe('two');
    expect(await memo('user-1', () => Promise.resolve('again'))).toBe('again');
  });

  it('does not remember a failure', async () => {
    const memo = createKeyedMemo<string>();
    await expect(memo('a', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
    expect(await memo('a', () => Promise.resolve('recovered'))).toBe('recovered');
  });
});
