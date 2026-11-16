import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_WEB_VIEW_SIZE, MIN_WEB_VIEW_SIZE, useWebViewStore } from '../src/stores/web-view-store';

beforeEach(() => {
  useWebViewStore.setState(useWebViewStore.getInitialState(), true);
});

describe('web view store', () => {
  it('toggles the web view of a city without affecting other cities', () => {
    const { toggleWebView } = useWebViewStore.getState();

    toggleWebView('city-a');
    toggleWebView('city-b');
    expect([...useWebViewStore.getState().openCityIds]).toEqual(['city-a', 'city-b']);

    toggleWebView('city-a');
    expect([...useWebViewStore.getState().openCityIds]).toEqual(['city-b']);
  });

  it('keeps the size of a closed web view and clamps it to the allowed range', () => {
    const { openWebView, closeWebView, setWebViewSize } = useWebViewStore.getState();

    openWebView('city-a');
    setWebViewSize('city-a', { width: 10, height: 100_000 });
    closeWebView('city-a');

    expect(useWebViewStore.getState().sizes.get('city-a')).toEqual({
      width: MIN_WEB_VIEW_SIZE.width,
      height: MAX_WEB_VIEW_SIZE.height,
    });
  });
});
