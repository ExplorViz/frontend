const REGEX_PREFIX = 'regex:';

function escapeRegexChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(pattern: string, separator = '/'): RegExp {
  let regex = '^';
  let i = 0;
  const sep = escapeRegexChar(separator);

  while (i < pattern.length) {
    const char = pattern[i];
    if (char === '*' && pattern[i + 1] === '*') {
      const rest = pattern.slice(i + 2);
      if (rest.startsWith(separator)) {
        regex += `(?:[^${sep}]+${sep})*`;
        i += 2 + separator.length;
      } else if (rest.length === 0) {
        regex += '.*';
        i += 2;
      } else {
        regex += '.*';
        i += 2;
      }
    } else if (char === '*') {
      regex += `[^${sep}]*`;
      i += 1;
    } else if (char === '?') {
      regex += `[^${sep}]`;
      i += 1;
    } else {
      regex += escapeRegexChar(char);
      i += 1;
    }
  }

  regex += '$';
  return new RegExp(regex);
}

function compileExpressionUncached(expression: string): RegExp | null {
  const trimmed = expression.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith(REGEX_PREFIX)) {
    try {
      return new RegExp(trimmed.slice(REGEX_PREFIX.length));
    } catch {
      return null;
    }
  }

  try {
    return globToRegExp(trimmed);
  } catch {
    return null;
  }
}

// Matching runs once per building, so recompiling the same handful of user
// expressions for every candidate dominated the filter cost on large
// landscapes. Compiled patterns are stateless (no /g flag is ever set), so they
// are safe to share across calls.
const compiledExpressions = new Map<string, RegExp | null>();
const COMPILED_EXPRESSION_CACHE_LIMIT = 512;

function compileExpression(expression: string): RegExp | null {
  const cached = compiledExpressions.get(expression);
  if (cached !== undefined) {
    return cached;
  }

  const compiled = compileExpressionUncached(expression);

  // Expressions come from user input, so bound the cache rather than letting it
  // grow with every intermediate value typed into the filter field.
  if (compiledExpressions.size >= COMPILED_EXPRESSION_CACHE_LIMIT) {
    compiledExpressions.clear();
  }
  compiledExpressions.set(expression, compiled);

  return compiled;
}

/** Matches nothing, standing in for an expression that failed to compile. */
const NEVER_MATCHING = /(?!)/;

/**
 * Compiles every non-blank expression once, so callers testing many texts
 * against the same expression list pay the compilation cost a single time.
 *
 * Expressions that fail to compile are kept as never-matching patterns: they
 * still count as "an expression is set", which is what decides whether an
 * inclusion list restricts the result.
 */
export function compileSearchExpressions(
  expressions: readonly string[]
): RegExp[] {
  const compiled: RegExp[] = [];

  for (const expression of expressions) {
    if (expression.trim().length === 0) {
      continue;
    }
    compiled.push(compileExpression(expression) ?? NEVER_MATCHING);
  }

  return compiled;
}

export function matchesAnyCompiledExpression(
  text: string,
  compiledExpressionList: readonly RegExp[]
): boolean {
  for (const regex of compiledExpressionList) {
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

export function matchesSearchExpression(
  text: string,
  expression: string
): boolean {
  const regex = compileExpression(expression);
  if (!regex) {
    return false;
  }
  return regex.test(text);
}

export function isIncludedBySearchExpressions(
  text: string,
  inclusionExpressions: readonly string[]
): boolean {
  const compiled = compileSearchExpressions(inclusionExpressions);
  if (compiled.length === 0) {
    return true;
  }
  return matchesAnyCompiledExpression(text, compiled);
}

export function isExcludedBySearchExpressions(
  text: string,
  exclusionExpressions: readonly string[]
): boolean {
  return matchesAnyCompiledExpression(
    text,
    compileSearchExpressions(exclusionExpressions)
  );
}
