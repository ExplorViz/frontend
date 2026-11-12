import { useState } from 'react';

const STORAGE_KEY = 'bottomBarHeightInPx';
const MIN_HEIGHT_IN_PX = 120;
// Keep the navbar, sidebar buttons and a strip of the city visible
const MIN_VISIBLE_CANVAS_IN_PX = 160;
const DEFAULT_HEIGHT_IN_PERCENT_OF_WINDOW = 40;
const COMMIT_CHART_DEFAULT_HEIGHT_IN_PERCENT_OF_WINDOW = 30;

export function clampBottomBarHeight(height: number) {
  const maxHeight = Math.max(MIN_HEIGHT_IN_PX, window.innerHeight - MIN_VISIBLE_CANVAS_IN_PX);
  return Math.min(Math.max(height, MIN_HEIGHT_IN_PX), maxHeight);
}

/** Bottom bar height in px, persisted across sessions */
export default function useBottomBarHeight(isCommitChart: boolean) {
  const [savedHeight, setSavedHeight] = useState(() => {
    const storedHeight = Number(localStorage.getItem(STORAGE_KEY));
    return storedHeight > 0 ? clampBottomBarHeight(storedHeight) : null;
  });
  const defaultHeightInPercent = isCommitChart
    ? COMMIT_CHART_DEFAULT_HEIGHT_IN_PERCENT_OF_WINDOW
    : DEFAULT_HEIGHT_IN_PERCENT_OF_WINDOW;
  const height = savedHeight ?? clampBottomBarHeight((window.innerHeight * defaultHeightInPercent) / 100);

  const updateHeight = (newHeight: number) => {
    const clampedHeight = clampBottomBarHeight(newHeight);
    setSavedHeight(clampedHeight);
    localStorage.setItem(STORAGE_KEY, clampedHeight.toString());
  };

  return [height, updateHeight] as const;
}
