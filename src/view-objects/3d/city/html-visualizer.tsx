import { SyncIcon } from '@primer/octicons-react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { WebViewSize } from 'explorviz-frontend/src/stores/web-view-store';
import { assignStackIndices } from 'explorviz-frontend/src/utils/dom-box-stacking';
import HtmlDomBox from 'explorviz-frontend/src/view-objects/3d/city/html-dom-box';
import * as htmlToImage from 'html-to-image';
import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** Height of the control panel above the 3D boxes in CSS pixels. */
const CONTROLS_HEIGHT = 96;
/** Minimal delay between two recomputations triggered by DOM mutations. */
const MUTATION_DEBOUNCE_MS = 100;
const HTML_PIXELS_PER_UNIT = 40;
/** Change of the distance between layers (in CSS pixels) per pixel of horizontal scrolling. */
const DISTANCE_PER_SCROLL_PIXEL = 0.25;
const MIN_DISTANCE_BETWEEN_LEVELS = 1;
/** Distance between overlapping boxes of the same layer in CSS pixels (larger than the box depth of 1 px). */
const STACK_DISTANCE = 2;

/**
 * Returns the horizontal scroll distance in pixels (e.g., of the thumb wheel of a mouse),
 * or 0 if the wheel event is mainly a vertical scroll.
 */
function getHorizontalScrollPixels(event: WheelEvent) {
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return 0;
  const pixelsPerUnit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === 2 ? 100 : 1;
  return event.deltaX * pixelsPerUnit;
}

/**
 * Whether the web page shows the element, i.e., it has a box and neither it nor an ancestor is hidden via
 * `display: none`, `visibility: hidden` or `opacity: 0`.
 */
function isRendered(element: Element) {
  // Not supported by older browsers, all elements are shown there
  if (typeof element.checkVisibility !== 'function') return true;
  // The newer option names and their older aliases (supported by more browser versions)
  return element.checkVisibility({
    opacityProperty: true,
    visibilityProperty: true,
    checkOpacity: true,
    checkVisibilityCSS: true,
  });
}

/** Whether the object and all of its ancestors are visible. */
function isShown(object: THREE.Object3D | null): boolean {
  for (let current = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}

function stopPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

/**
 * Visualizes the DOM of the given (same-origin) document as stacked 3D boxes.
 * Each DOM level is lifted by `distanceBetweenLevels` CSS pixels.
 *
 * @param origin Top-left corner of the visualized viewport in local coordinates.
 * @param pixelScale World units per CSS pixel.
 */
export default function HtmlVisualizer({
  html,
  updateHtml,
  pixelScale,
  viewportSize,
  origin,
}: {
  html: Document | undefined;
  updateHtml: () => void;
  pixelScale: number;
  viewportSize: WebViewSize;
  origin: [number, number, number];
}) {
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [useHashedColors, setUseHashedColors] = useState(false);
  const [renderHtmlTextures, setRenderHtmlTextures] = useState(false);
  const [renderOnlyHtmlLeafs, setRenderOnlyHtmlLeafs] = useState(true);
  const [distanceBetweenLevels, setDistanceBetweenLevels] = useState(35);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [clickedNode, setClickedNode] = useState<Element | null>(null);
  const [updateWithObserver, setUpdateWithObserver] = useState(true);
  const [restrictToLayer, setRestrictToLayer] = useState(0);
  const [searchString, setSearchString] = useState('');
  const [cropToViewport, setCropToViewport] = useState(true);
  const [maxLayer, setMaxLayer] = useState(0);
  const [maxStackIndex, setMaxStackIndex] = useState(0);

  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const eventSource = useThree((state) => state.events.connected) as HTMLElement | null | undefined;
  const boxesGroupRef = useRef<THREE.Group>(null);

  // Scrolling to the right increases the distance between layers, scrolling to the left decreases it
  const changeDistanceByScrolling = (event: WheelEvent) => {
    const scrollPixels = getHorizontalScrollPixels(event);
    if (scrollPixels === 0) return false;
    setDistanceBetweenLevels((current) =>
      Math.max(MIN_DISTANCE_BETWEEN_LEVELS, current + scrollPixels * DISTANCE_PER_SCROLL_PIXEL)
    );
    return true;
  };

  // Horizontal scrolling while the pointer is on a layer (box) changes the distance between layers.
  // A capturing listener is needed to handle the event before the camera controls, which listen on the same element.
  useEffect(() => {
    if (!html) return;
    const target = eventSource ?? gl.domElement;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleWheel = (event: WheelEvent) => {
      const group = boxesGroupRef.current;
      if (!group || getHorizontalScrollPixels(event) === 0) return;

      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);
      const isOnLayer = raycaster
        .intersectObjects(group.children, true)
        .some((intersection) => intersection.object.userData.isDomBox && isShown(intersection.object));
      if (!isOnLayer) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      changeDistanceByScrolling(event);
    };

    target.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => target.removeEventListener('wheel', handleWheel, { capture: true });
  }, [html, camera, gl, eventSource]);

  // Stable ids keep the React keys (and thereby the meshes) of unchanged DOM nodes
  const nodeIds = useRef(new WeakMap<Element, number>());
  const nextNodeId = useRef(0);

  const getNodeId = (node: Element) => {
    let id = nodeIds.current.get(node);
    if (id === undefined) {
      id = nextNodeId.current++;
      nodeIds.current.set(node, id);
    }
    return 'dom-box-' + id;
  };

  // Recompute when the document changes (debounced, since pages may mutate continuously)
  useEffect(() => {
    if (!html || !updateWithObserver) return;
    let timeout: number | undefined;
    const observer = new MutationObserver(() => {
      if (timeout !== undefined) return;
      timeout = window.setTimeout(() => {
        timeout = undefined;
        setReloadCounter((current) => current + 1);
      }, MUTATION_DEBOUNCE_MS);
    });
    observer.observe(html, { attributes: true, characterData: true, childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [html, updateWithObserver]);

  useEffect(() => {
    if (!html) {
      setBoxes([]);
      return;
    }

    let cancelled = false;
    const { width, height } = viewportSize;

    const computeBoxes = (img?: HTMLImageElement) => {
      const tempBoxes: BoxData[] = [];
      let firstOffset: NodeOffset | null = null;
      let maxLevel = 0;

      const processNode = (node: Element, level: number, insideClickedSubtree = false) => {
        maxLevel = Math.max(maxLevel, level);
        if (clickedNode === node) {
          insideClickedSubtree = true;
        }

        const clampedRect = getClampedRect(node.getBoundingClientRect(), width, height);
        const rect = cropToViewport ? clampedRect : node.getBoundingClientRect();

        if (!firstOffset) {
          firstOffset = { x: rect.left * pixelScale, y: rect.top * pixelScale };
        }

        if (clickedNode && !insideClickedSubtree) {
          Array.from(node.children).forEach((child) => processNode(child, level + 1));
          return;
        }

        // Elements that the web page does not show (e.g., entries filtered out by the web application) get no
        // box. Their children are still visited, since they may be visible again (e.g., `visibility: visible`).
        if (!isRendered(node)) {
          Array.from(node.children).forEach((child) => processNode(child, level + 1, insideClickedSubtree));
          return;
        }

        // Only display the HTML element itself without its child nodes
        const htmlString = node.outerHTML.replace(node.innerHTML || '', '');
        // Note: `instanceof HTMLElement` does not work here, the node belongs to the realm of the iframe
        const innerText =
          node.firstChild?.nodeType === Node.TEXT_NODE
            ? ((node as HTMLElement).innerText ?? node.textContent ?? '')
            : '';
        const htmlWithText = htmlString.replace('>', '>' + innerText);
        const isLeaf = !Array.from(node.children).some(isRendered);
        const renderHtml = renderHtmlTextures && (!renderOnlyHtmlLeafs || isLeaf);

        if (!cropToViewport || (clampedRect.width > 0 && clampedRect.height > 0)) {
          const offset = getOffset(rect, firstOffset, pixelScale);
          tempBoxes.push({
            id: getNodeId(node),
            position: [offset.x, offset.y],
            size: [Math.max(pixelScale, rect.width * pixelScale), Math.max(pixelScale, rect.height * pixelScale)],
            htmlNode: node,
            isSubtreeRoot: node === clickedNode,
            level,
            stackIndex: 0,
            htmlWithText,
            texture: renderHtml && img ? getTextureForRect(clampedRect, img) : null,
          });
        }

        Array.from(node.children).forEach((child) => processNode(child, level + 1, insideClickedSubtree));
      };

      Array.from(html.children).forEach((node) => processNode(node, 0));

      if (cancelled) {
        tempBoxes.forEach((box) => box.texture?.dispose());
        return;
      }
      setMaxLayer(maxLevel);
      setMaxStackIndex(assignStackIndices(tempBoxes));
      setBoxes(tempBoxes);
    };

    const body = html.body;
    if (renderHtmlTextures && body) {
      htmlToImage
        .toPng(body, { width, height, pixelRatio: 1 })
        .then(async (dataUrl) => {
          const img = new Image();
          img.src = dataUrl;
          await img.decode();
          if (!cancelled) computeBoxes(img);
        })
        .catch(() => {
          console.error('Could not create image of HTML!');
          if (!cancelled) computeBoxes();
        });
    } else {
      computeBoxes();
    }

    return () => {
      cancelled = true;
    };
  }, [
    cropToViewport,
    html,
    reloadCounter,
    renderHtmlTextures,
    renderOnlyHtmlLeafs,
    clickedNode,
    pixelScale,
    viewportSize.width,
    viewportSize.height,
  ]);

  // Free GPU memory of textures that are no longer displayed
  useEffect(() => () => boxes.forEach((box) => box.texture?.dispose()), [boxes]);

  if (!html) return null;

  const isBoxVisible = (box: BoxData) =>
    (!restrictToLayer || box.level + 1 === restrictToLayer) &&
    (!searchString || box.htmlWithText.toLowerCase().includes(searchString.toLowerCase()));

  const visibleBoxCount = boxes.filter(isBoxVisible).length;
  const viewportWidth = viewportSize.width * pixelScale;
  const viewportHeight = viewportSize.height * pixelScale;
  const levelDistance = distanceBetweenLevels * pixelScale;
  // Overlapping boxes of a layer are stacked by this offset. The stack takes at most half of the distance
  // between two layers, such that it does not reach into the next layer.
  const stackDistance = Math.min(STACK_DISTANCE * pixelScale, levelDistance / 2 / (maxStackIndex + 1));

  return (
    <group
      position={origin}
      // Keep the meshes behind the visualization (e.g., other cities) from reacting
      onPointerOver={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <Html
        transform
        occlude="blending"
        scale={pixelScale * HTML_PIXELS_PER_UNIT}
        position={[viewportWidth / 2, (CONTROLS_HEIGHT / 2 + 8) * pixelScale, 0]}
      >
        <div
          className="web-view-inspector"
          style={{ width: viewportSize.width, height: CONTROLS_HEIGHT }}
          onPointerDown={stopPropagation}
          onPointerUp={stopPropagation}
          onClick={stopPropagation}
          onDoubleClick={stopPropagation}
          onContextMenu={stopPropagation}
          onWheel={stopPropagation}
        >
          <label>
            Distance
            <input
              type="number"
              className="form-control form-control-sm"
              min={MIN_DISTANCE_BETWEEN_LEVELS}
              title="Scroll horizontally here or on a layer to change the distance"
              value={Math.round(distanceBetweenLevels)}
              onChange={(event) => {
                const value = parseFloat(event.target.value);
                if (!isNaN(value)) setDistanceBetweenLevels(Math.max(MIN_DISTANCE_BETWEEN_LEVELS, value));
              }}
              onWheel={(event) => changeDistanceByScrolling(event.nativeEvent)}
            />
          </label>
          <label>
            Only show layer
            <input
              type="number"
              className="form-control form-control-sm"
              min={0}
              max={maxLayer + 1}
              title="0 shows all layers. Scroll horizontally here to change the distance between layers"
              value={restrictToLayer}
              onChange={(event) => {
                const value = parseInt(event.target.value, 10);
                if (!isNaN(value)) setRestrictToLayer(Math.max(0, Math.min(maxLayer + 1, value)));
              }}
              onWheel={(event) => changeDistanceByScrolling(event.nativeEvent)}
            />
          </label>
          <label>
            Search
            <input
              type="search"
              className="form-control form-control-sm"
              value={searchString}
              onChange={(event) => setSearchString(event.target.value)}
            />
          </label>
          <InspectorCheckbox label="Cont. update" checked={updateWithObserver} onChange={setUpdateWithObserver} />
          <InspectorCheckbox label="Crop to viewport" checked={cropToViewport} onChange={setCropToViewport} />
          <InspectorCheckbox label="Hashed colors" checked={useHashedColors} onChange={setUseHashedColors} />
          <InspectorCheckbox label="Render HTML" checked={renderHtmlTextures} onChange={setRenderHtmlTextures} />
          {renderHtmlTextures && (
            <InspectorCheckbox
              label="Render only leafs"
              checked={renderOnlyHtmlLeafs}
              onChange={setRenderOnlyHtmlLeafs}
            />
          )}
          <span className="web-view-inspector-count">HTML nodes: {visibleBoxCount}</span>
          <button
            type="button"
            className="btn btn-sm btn-light"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => {
              updateHtml();
              setReloadCounter((current) => current + 1);
            }}
          >
            <SyncIcon />
          </button>
        </div>
      </Html>
      {/* Backdrop that marks the extent of the visualized viewport */}
      <mesh position={[viewportWidth / 2, -viewportHeight / 2, -pixelScale * 2]}>
        <boxGeometry args={[viewportWidth, viewportHeight, pixelScale * 2]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <group ref={boxesGroupRef}>
        {boxes.map((box) => (
          <HtmlDomBox
            key={box.id}
            visible={isBoxVisible(box)}
            levelDistance={levelDistance}
            stackDistance={stackDistance}
            pixelScale={pixelScale}
            box={box}
            color={useHashedColors ? hashElementToColor(box.htmlNode) : COLORS_GRAD[box.level % COLORS_GRAD.length]}
            setClickedNode={setClickedNode}
          />
        ))}
      </group>
    </group>
  );
}

function InspectorCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="form-check-label web-view-inspector-checkbox">
      <input
        type="checkbox"
        className="form-check-input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

const COLORS_GRAD = [
  '#4B0082',
  '#800080',
  '#B22222',
  '#A0522D',
  '#CD5C5C',
  '#8B008B',
  '#9932CC',
  '#FF4500',
  '#FF8C00',
  '#B8860B',
  '#D2691E',
  '#DAA520',
  '#ADFF2F',
  '#7FFF00',
  '#32CD32',
  '#00FF00',
  '#00FA9A',
  '#40E0D0',
  '#4682B4',
  '#1E90FF',
  '#0000FF',
  '#4169E1',
  '#8A2BE2',
  '#FF00FF',
  '#FF1493',
  '#FF69B4',
  '#FF6347',
  '#FFA07A',
  '#FFA500',
  '#FFD700',
  '#FFFF00',
  '#FFFACD',
  '#F0E68C',
  '#E6E6FA',
  '#F0F8FF',
  '#E0FFFF',
  '#AFEEEE',
  '#ADD8E6',
  '#87CEFA',
  '#B0C4DE',
  '#D3D3D3',
  '#DDA0DD',
  '#EE82EE',
  '#F5DEB3',
  '#FAFAD2',
  '#FFE4E1',
  '#FFF0F5',
  '#F5F5DC',
  '#FFFFE0',
  '#FFF8DC',
  '#F8F8FF',
  '#FFFFFF',
];

function getOffset(rect: DOMRect, firstOffset: NodeOffset, pixelScale: number) {
  return {
    x: (rect.left + rect.width / 2) * pixelScale - firstOffset.x,
    y: -(rect.top + rect.height / 2) * pixelScale + firstOffset.y,
  };
}

function stringToHash(str: string) {
  let hash = 133; // Start values for hashing

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i); // DJB2 hash
  }

  return hash >>> 0; // Ensure it's unsigned
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

function getClampedRect(rect: DOMRect, width: number, height: number) {
  const clampedLeft = clamp(rect.left, 0, width);
  const clampedRight = clamp(rect.right, 0, width);
  const clampedTop = clamp(rect.top, 0, height);
  const clampedBottom = clamp(rect.bottom, 0, height);

  return new DOMRect(
    clampedLeft,
    clampedTop,
    Math.max(0, clampedRight - clampedLeft),
    Math.max(0, clampedBottom - clampedTop)
  );
}

function getTextureForRect(rect: DOMRect, img: HTMLImageElement) {
  if (rect.width < 1 || rect.height < 1) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = rect.width;
  canvas.height = rect.height;
  // Copy the part of the page screenshot that is covered by the element
  ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function hashElementToColor(element: Element) {
  const tagHash = stringToHash(element.tagName.toLowerCase());
  const classHash = stringToHash(typeof element.className === 'string' ? element.className : '');
  const innerHash = stringToHash(element.textContent ?? '');

  // Convert hash to HSL color
  const hue = tagHash % 360;
  const saturation = 60 + (classHash % 40);
  const lightness = 40 + (innerHash % 20);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export type BoxData = {
  id: string;
  /** Center of the box (x, y) relative to the top-left corner of the viewport. */
  position: [number, number];
  /** Width and height of the box. */
  size: [number, number];
  htmlNode: Element;
  isSubtreeRoot: boolean;
  level: number;
  /** Position within the stack of overlapping boxes of the same level (0 = backmost). */
  stackIndex: number;
  htmlWithText: string;
  texture: THREE.CanvasTexture | null;
};

type NodeOffset = {
  x: number;
  y: number;
};
