import {
  Language,
  SUPPORTED_LANGUAGES,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

const LANGUAGE_TO_LABEL = new Map<Language, string>([
  ['LANGUAGE_UNSPECIFIED', 'Other'],
  ['C', 'C'],
  ['CPP', 'C++'],
  ['CSHARP', 'C#'],
  ['GO', 'Go'],
  ['JAVA', 'Java'],
  ['JAVASCRIPT', 'JavaScript'],
  ['KOTLIN', 'Kotlin'],
  ['PHP', 'PHP'],
  ['PLAINTEXT', 'Plain Text'],
  ['PYTHON', 'Python'],
  ['RUST', 'Rust'],
  ['SWIFT', 'Swift'],
  ['TYPESCRIPT', 'TypeScript'],
]);

const TRAILING_LANGUAGES: Language[] = ['PLAINTEXT', 'LANGUAGE_UNSPECIFIED'];

/**
 * Returns a human-friendly textual representation for the given language.
 * If the input is not a valid language according to {@link Language}, undefined is returned.
 */
export function getLabelForLanguage(lang: Language) {
  return LANGUAGE_TO_LABEL.get(lang);
}

/**
 * Attempts to convert a raw string value into a {@link Language}.
 *
 * The value trimmed and converted to uppercase. If this value does not match
 * a supported language or if it is is undefined or null, the unspecified language
 * is returned. Otherwise, the matching language value is returned.
 */
export function normalizeLanguage(lang: string | undefined | null): Language {
  if (!lang) {
    return 'LANGUAGE_UNSPECIFIED';
  }

  const normalized = lang.trim().toUpperCase();
  if (SUPPORTED_LANGUAGES.includes(normalized as Language)) {
    return normalized as Language;
  }

  return 'LANGUAGE_UNSPECIFIED';
}

/**
 * Returns a shallow copy of the provided array of {@link Language} values,
 * sorted according to a custom ordering. Values are sorted alphabetically,
 * but certain special cases should always be placed after the regular languages.
 */
export function sortLanguages(languages: Language[]): Language[] {
  return [...languages].sort(compareLanguages);
}

function compareLanguages(a: Language, b: Language): number {
  const aTrailingIndex = TRAILING_LANGUAGES.indexOf(a);
  const bTrailingIndex = TRAILING_LANGUAGES.indexOf(b);

  if (aTrailingIndex !== -1 || bTrailingIndex !== -1) {
    if (aTrailingIndex !== -1 && bTrailingIndex !== -1) {
      return aTrailingIndex - bTrailingIndex;
    }
    return aTrailingIndex !== -1 ? 1 : -1;
  }

  return a.localeCompare(b);
}
