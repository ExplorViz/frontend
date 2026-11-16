import { CodeIcon, HomeIcon, SyncIcon, XIcon } from '@primer/octicons-react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { DEFAULT_WEB_VIEW_SIZE, useWebViewStore, type WebViewSize } from 'explorviz-frontend/src/stores/web-view-store';
import { City } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import BoxLayout from 'explorviz-frontend/src/utils/layout/box-layout';
import HtmlVisualizer from 'explorviz-frontend/src/view-objects/3d/city/html-visualizer';
import { type PointerEvent as ReactPointerEvent, type SyntheticEvent, useRef, useState } from 'react';
import * as THREE from 'three';

/** Height of the toolbar above the embedded page in CSS pixels. */
const TOOLBAR_HEIGHT = 48;
/** Minimal width of the web view in city units (keeps it usable next to tiny cities). */
const MIN_WORLD_WIDTH = 300;
/** drei's <Html transform> renders 1 CSS pixel as 1/40 world units (times its scale). */
const HTML_PIXELS_PER_UNIT = 40;
/** Distance between the bottom of the web view and the city foundation in CSS pixels. */
const BOTTOM_GAP = 16;

type ResizeAxes = { x: boolean; y: boolean };

type ResizeState = {
  axes: ResizeAxes;
  startPoint: THREE.Vector3;
  startSize: WebViewSize;
};

/** Web page that a web view opens initially and that its home button leads to. */
const DEFAULT_WEB_VIEW_URL = 'http://localhost:8080';

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  // Note: 'localhost:8080' has no scheme, hence only '<scheme>://' and 'about:' count as absolute URLs
  if (!trimmed || /^([a-z][a-z\d+.-]*:\/\/|about:)/i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

/** Keeps pointer and wheel events inside the web view away from the camera controls and the 3D scene. */
function stopPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

const stopPropagationHandlers = {
  onPointerDown: stopPropagation,
  onPointerUp: stopPropagation,
  onClick: stopPropagation,
  onDoubleClick: stopPropagation,
  onContextMenu: stopPropagation,
  onWheel: stopPropagation,
};

/**
 * Web view (embedded browser) that stands upright at the back edge of a city.
 * It is opened via the context menu of the city foundation and can be resized
 * by dragging its top or right edge (or its top-right corner) with the left mouse button.
 */
export default function EmbeddedBrowser({ city, layout }: { city: City; layout: BoxLayout }) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);

  const iFrameRef = useRef<HTMLIFrameElement>(null);
  const anchorRef = useRef<THREE.Group>(null);
  const resizeState = useRef<ResizeState | null>(null);

  const [url, setUrl] = useState(DEFAULT_WEB_VIEW_URL);
  const [urlInput, setUrlInput] = useState(DEFAULT_WEB_VIEW_URL);
  const [reloadKey, setReloadKey] = useState(0);
  const [inspectedDocument, setInspectedDocument] = useState<Document | undefined>(undefined);
  const [isResizing, setIsResizing] = useState(false);

  // World units per CSS pixel, fixed while the web view is open so that it does not jump on layout changes.
  const [pixelScale] = useState(() => Math.max(layout.width, MIN_WORLD_WIDTH) / DEFAULT_WEB_VIEW_SIZE.width);

  const size = useWebViewStore((state) => state.sizes.get(city.id)) ?? DEFAULT_WEB_VIEW_SIZE;
  const setWebViewSize = useWebViewStore((state) => state.setWebViewSize);
  const closeWebView = useWebViewStore((state) => state.closeWebView);
  const showErrorToastMessage = useToastHandlerStore((state) => state.showErrorToastMessage);

  const panelWidth = size.width * pixelScale;
  const panelHeight = (size.height + TOOLBAR_HEIGHT) * pixelScale;
  const backdropDepth = 4 * pixelScale;

  const readIFrameDocument = () => {
    try {
      // Throws a SecurityError for cross-origin pages
      return iFrameRef.current?.contentWindow?.document ?? undefined;
    } catch {
      return undefined;
    }
  };

  const updateInspectedDocument = () => {
    const iFrameDocument = readIFrameDocument();
    if (!iFrameDocument) {
      showErrorToastMessage('Could not inspect the web page. Only pages from the same origin can be inspected.');
    }
    setInspectedDocument(iFrameDocument);
  };

  const toggleInspector = () => {
    if (inspectedDocument) {
      setInspectedDocument(undefined);
    } else {
      updateInspectedDocument();
    }
  };

  const handleIFrameLoad = () => {
    // The previous document is gone after a navigation inside the iframe
    if (inspectedDocument) {
      const iFrameDocument = readIFrameDocument();
      setInspectedDocument(iFrameDocument);
      if (!iFrameDocument) {
        showErrorToastMessage('Stopped inspecting: the new web page is from another origin.');
      }
    }
  };

  const navigate = (target: string) => {
    const normalized = normalizeUrl(target);
    setUrlInput(normalized);
    setUrl(normalized);
    setInspectedDocument(undefined);
    setReloadKey((key) => key + 1);
  };

  /** Intersects the pointer ray with the plane of the web view and returns the point in anchor coordinates. */
  const getPointerPositionOnPlane = (clientX: number, clientY: number) => {
    const anchor = anchorRef.current;
    if (!anchor) return null;

    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);

    anchor.updateWorldMatrix(true, false);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(anchor.matrixWorld);
    const origin = new THREE.Vector3().setFromMatrixPosition(anchor.matrixWorld);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin);

    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    return hit ? anchor.worldToLocal(hit) : null;
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>, axes: ResizeAxes) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startPoint = getPointerPositionOnPlane(event.clientX, event.clientY);
    if (!startPoint) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    resizeState.current = { axes, startPoint, startSize: size };
    setIsResizing(true);
  };

  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = resizeState.current;
    if (!state) return;
    event.stopPropagation();

    const point = getPointerPositionOnPlane(event.clientX, event.clientY);
    if (!point) return;

    // The web view is anchored at its bottom-left corner, hence it grows to the right and upwards
    setWebViewSize(city.id, {
      width: state.axes.x ? state.startSize.width + (point.x - state.startPoint.x) / pixelScale : state.startSize.width,
      height: state.axes.y
        ? state.startSize.height + (point.y - state.startPoint.y) / pixelScale
        : state.startSize.height,
    });
  };

  const endResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeState.current) return;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeState.current = null;
    setIsResizing(false);
  };

  return (
    <group ref={anchorRef} position={[0, layout.positionY + layout.height + BOTTOM_GAP * pixelScale, 0]}>
      {/* Opaque back side, the HTML itself is only visible from the front */}
      <mesh position={[panelWidth / 2, panelHeight / 2, -(backdropDepth / 2 + pixelScale)]}>
        <boxGeometry args={[panelWidth, panelHeight, backdropDepth]} />
        <meshBasicMaterial color="#6c757d" />
      </mesh>
      <Html
        transform
        occlude="blending"
        scale={pixelScale * HTML_PIXELS_PER_UNIT}
        position={[panelWidth / 2, panelHeight / 2, 0]}
      >
        <div
          className={'web-view' + (isResizing ? ' web-view--resizing' : '')}
          style={{ width: size.width, height: size.height + TOOLBAR_HEIGHT }}
          {...stopPropagationHandlers}
        >
          <form
            className="web-view-toolbar"
            style={{ height: TOOLBAR_HEIGHT }}
            onSubmit={(event) => {
              event.preventDefault();
              navigate(urlInput);
            }}
          >
            <button
              type="button"
              className="btn btn-sm btn-light"
              title="Go to start page"
              aria-label="Go to start page"
              onClick={() => navigate(DEFAULT_WEB_VIEW_URL)}
            >
              <HomeIcon />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              title="Reload"
              aria-label="Reload"
              onClick={() => navigate(url)}
            >
              <SyncIcon />
            </button>
            <input
              type="text"
              className="form-control form-control-sm"
              aria-label="URL"
              placeholder="Enter a URL and press Enter"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
            />
            <button
              type="button"
              className={'btn btn-sm ' + (inspectedDocument ? 'btn-primary' : 'btn-light')}
              title={inspectedDocument ? 'Stop inspecting HTML' : 'Inspect HTML in 3D'}
              aria-label={inspectedDocument ? 'Stop inspecting HTML' : 'Inspect HTML in 3D'}
              aria-pressed={!!inspectedDocument}
              disabled={!url}
              onClick={toggleInspector}
            >
              <CodeIcon />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light"
              title="Close web view"
              aria-label="Close web view"
              onClick={() => closeWebView(city.id)}
            >
              <XIcon />
            </button>
          </form>
          {url ? (
            <iframe
              key={reloadKey}
              ref={iFrameRef}
              title={`Web view of ${city.name}`}
              width={size.width}
              height={size.height}
              src={url}
              onLoad={handleIFrameLoad}
              // allow-scripts + allow-same-origin is intentional: embedded apps need their own storage/cookies
              // and the HTML inspector reads iframe.contentWindow.document.
              // eslint-disable-next-line react-dom/no-unsafe-iframe-sandbox
              sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
            />
          ) : (
            <div className="web-view-placeholder" style={{ height: size.height }}>
              Enter a URL above to show a web page next to {city.name}.
            </div>
          )}
          <ResizeHandle edge="top" onStart={startResize} onMove={resize} onEnd={endResize} />
          <ResizeHandle edge="right" onStart={startResize} onMove={resize} onEnd={endResize} />
          <ResizeHandle edge="corner" onStart={startResize} onMove={resize} onEnd={endResize} />
        </div>
      </Html>
      <HtmlVisualizer
        html={inspectedDocument}
        updateHtml={updateInspectedDocument}
        pixelScale={pixelScale}
        viewportSize={size}
        origin={[panelWidth + 40 * pixelScale, size.height * pixelScale, 0]}
      />
    </group>
  );
}

const RESIZE_AXES: Record<'top' | 'right' | 'corner', ResizeAxes> = {
  top: { x: false, y: true },
  right: { x: true, y: false },
  corner: { x: true, y: true },
};

type ResizePointerHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

function ResizeHandle({
  edge,
  onStart,
  onMove,
  onEnd,
}: {
  edge: keyof typeof RESIZE_AXES;
  onStart: (event: ReactPointerEvent<HTMLDivElement>, axes: ResizeAxes) => void;
  onMove: ResizePointerHandler;
  onEnd: ResizePointerHandler;
}) {
  return (
    <div
      className={`web-view-resize web-view-resize--${edge}`}
      title="Hold the left mouse button and drag to resize"
      onPointerDown={(event) => onStart(event, RESIZE_AXES[edge])}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onLostPointerCapture={onEnd}
    />
  );
}
