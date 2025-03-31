export const CHANGE_LANDSCAPE_EVENT = 'change_landscape';

export type ChangeLandscapeMessage = {
  event: typeof CHANGE_LANDSCAPE_EVENT;
  landscapeToken: string;
};
