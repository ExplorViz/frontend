// Approximate width of a character in em for the default label font
// (measured for Roboto, used by troika/drei <Text />).
const APPROXIMATE_EM_PER_CHARACTER = 0.6;

/** City foundation labels are only rendered above this label margin. */
export const MIN_CITY_LABEL_MARGIN = 1.5;

/** Font size (world units) of city foundation labels. */
export function getCityLabelFontSize(cityLabelMargin: number): number {
  return cityLabelMargin * 0.8;
}

/**
 * Returns the width that a single line label needs in world units.
 */
export function getTextWidth(text: string, fontSize: number): number {
  return text.length * APPROXIMATE_EM_PER_CHARACTER * fontSize;
}
