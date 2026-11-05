import { describe, expect, it } from 'vitest';
import {
  compileSearchExpressions,
  isExcludedBySearchExpressions,
  isIncludedBySearchExpressions,
  matchesAnyCompiledExpression,
  matchesSearchExpression,
} from '../src/utils/search-expression-matcher';

describe('building path filters', () => {
  it.each([
    ['src/App.ts', 'src/*.ts', true],
    ['src/nested/App.ts', 'src/*.ts', false],
    ['App.ts', '**/*.ts', true],
    ['src/nested/App.ts', '**/*.ts', true],
    ['src/a.ts', 'src/?.ts', true],
    ['src/ab.ts', 'src/?.ts', false],
    ['src/a.ts', 'src/**', true],
    ['a/b/end', 'a/**end', true],
    ['file[1].ts', 'file[1].ts', true],
    ['file1Xts', 'file[1].ts', false],
    ['App.tsx', '*.ts', false],
    ['App.ts', '  *.ts  ', true],
    ['App.ts', 'regex:^App\\.(ts|js)$', true],
    ['App.ts', 'regex:[', false],
    ['App.ts', ' ', false],
  ])('matches %s against %s => %s', (path, expression, expected) => {
    expect(matchesSearchExpression(path, expression)).toBe(expected);
  });

  it('allows everything with no inclusions and excludes nothing with no exclusions', () => {
    expect(isIncludedBySearchExpressions('App.ts', ['', ' '])).toBe(true);
    expect(isExcludedBySearchExpressions('App.ts', [])).toBe(false);
  });

  it('uses OR within each list and keeps invalid inclusions restrictive', () => {
    expect(isIncludedBySearchExpressions('App.ts', ['*.java', '*.ts'])).toBe(
      true
    );
    expect(isIncludedBySearchExpressions('App.ts', ['regex:['])).toBe(false);
    expect(isExcludedBySearchExpressions('App.ts', ['*.ts'])).toBe(true);
    expect(isExcludedBySearchExpressions('App.ts', ['regex:['])).toBe(false);
  });

  it('reuses compiled filters without changing repeated matches', () => {
    const filters = compileSearchExpressions(['', '**/*.ts', 'regex:[']);
    expect(filters).toHaveLength(2);
    for (let i = 0; i < 3; i++) {
      expect(matchesAnyCompiledExpression('src/App.ts', filters)).toBe(true);
      expect(matchesAnyCompiledExpression('README.md', filters)).toBe(false);
    }
    for (let i = 0; i < 520; i++) matchesSearchExpression('App.ts', `file${i}`);
    expect(matchesSearchExpression('App.ts', '**/*.ts')).toBe(true);
  });
});
