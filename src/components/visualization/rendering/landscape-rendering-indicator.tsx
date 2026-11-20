import { useIsLandscapeRendering } from 'explorviz-frontend/src/stores/landscape-render-progress';
import { Spinner } from 'react-bootstrap';

/**
 * Overlay shown on the canvas while a new landscape is being filtered, laid out
 * and drawn. It fades in after a short delay, so quick updates do not flash it.
 */
export default function LandscapeRenderingIndicator() {
  const isRendering = useIsLandscapeRendering();

  if (!isRendering) {
    return null;
  }

  return (
    <div className="landscape-rendering-indicator foreground below-navbar" role="status" aria-live="polite">
      <Spinner animation="border" size="sm" variant="primary" aria-hidden="true" />
      <span>Rendering landscape…</span>
    </div>
  );
}
