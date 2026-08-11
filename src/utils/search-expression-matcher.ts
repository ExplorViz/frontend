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

function compileExpression(expression: string): RegExp | null {
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
  if (inclusionExpressions.length === 0) {
    return true;
  }
  return inclusionExpressions.some((expression) =>
    matchesSearchExpression(text, expression)
  );
}

export function isExcludedBySearchExpressions(
  text: string,
  exclusionExpressions: readonly string[]
): boolean {
  if (exclusionExpressions.length === 0) {
    return false;
  }
  return exclusionExpressions.some((expression) =>
    matchesSearchExpression(text, expression)
  );
}
