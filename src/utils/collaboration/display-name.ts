/*
 * The display name a person types to collaborate while login is off. It is
 * remembered in the browser, so the next Room is entered under the same name,
 * whether from the collaboration tab or from the Rooms tab of the Landscapes page.
 */

const DISPLAY_NAME_KEY = 'explorviz.collaboration.displayName';

/** The most characters of a display name; the service cuts longer ones. */
export const MAX_DISPLAY_NAME_LENGTH = 40;

/** The remembered display name, or "" if there is none. */
export function readDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberDisplayName(name: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  } catch {
    // The name is only a convenience.
  }
}
