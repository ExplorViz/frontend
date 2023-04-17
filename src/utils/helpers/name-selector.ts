/**
 * Checks if a given string exists and is not empty. Otherwise returns
 * a passed fallback name.
 * @param fallbackName String which is returned if possibleName does not exist
 * @param possibleName String which is return if it contains characters
 */
export default function processNameSelector(
  fallbackName: string,
  possibleName: string
): string {
  if (possibleName && possibleName !== '') {
    return possibleName;
  }
  return fallbackName;
}
