// Approximate width of a character in em for the default label font
// (measured for Roboto, used by troika/drei <Text />).
const APPROXIMATE_EM_PER_CHARACTER = 0.6;

/** City foundation labels are only rendered above this label margin. */
export const MIN_CITY_LABEL_MARGIN = 1.5;

/** Font size (world units) of city foundation labels. */
export function getCityLabelFontSize(cityLabelMargin: number): number {
  return cityLabelMargin * 0.8;
}

/** Font size (world units) of labels of opened districts. */
export function getOpenDistrictLabelFontSize(
  districtLabelMargin: number
): number {
  return districtLabelMargin * 0.5;
}

/**
 * Returns the width that a single line label needs in world units.
 */
export function getTextWidth(text: string, fontSize: number): number {
  return text.length * APPROXIMATE_EM_PER_CHARACTER * fontSize;
}

/**
 * Shortens a label such that it fits into the given width. A suffix (e.g., an
 * annotation icon) is always preserved.
 */
export function truncateLabelToWidth(
  name: string,
  suffix: string,
  fontSize: number,
  maxWidth: number
): string {
  // No truncation needed if the label fits into the given width
  if (getTextWidth(name + suffix, fontSize) <= maxWidth) {
    return name + suffix;
  }

  const ellipsis = '...';
  const maxCharacters = Math.floor(
    maxWidth / (APPROXIMATE_EM_PER_CHARACTER * fontSize)
  );
  // Keep at least 3 characters to avoid truncating the label too much
  const keptCharacters = Math.max(
    3,
    maxCharacters - ellipsis.length - suffix.length
  );

  // Add ellipsis and always preserve the suffix for truncated label
  return name.substring(0, keptCharacters) + ellipsis + suffix;
}
