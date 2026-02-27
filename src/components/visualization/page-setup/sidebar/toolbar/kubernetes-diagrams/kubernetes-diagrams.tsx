import ColorPicker from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/color-picker';
import {
  DiagramType,
  useDiagramGenerator,
} from 'explorviz-frontend/src/hooks/useDiagramGenerator';
import { usePingStore } from 'explorviz-frontend/src/stores/ping-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/application/animated-ping-r3f';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { parse } from 'svg-parser';

type SvgTextNode = {
  type: 'text';
  value: string;
};

type SvgElementNode = {
  type: 'element';
  tagName: string;
  properties?: Record<string, any>;
  children?: SvgNode[];
};

type SvgNode = SvgTextNode | SvgElementNode;

type SvgRootNode = {
  type: 'root';
  children: SvgNode[];
};

type NodeClickHandler = (nodeName: string) => void;

// Cache for loaded SVGs
const svgCache = new Map<string, string>();
const svgExistenceMap = new Map<string, boolean>();

/**
 * Extract filename from image URL and map it to local SVG path
 * e.g., "https://.../sts.png" -> "/images/kubeDiagrams/sts.svg"
 */
function getLocalSvgPath(imageHref: string): string | null {
  try {
    const match = imageHref.match(/\/([^/]+\.png)$/);
    if (!match) return null;
    const filename = match[1];
    const svgFilename = filename.replace('.png', '.svg');
    return `/images/kubeDiagrams/${svgFilename}`;
  } catch (error) {
    console.error('Error extracting local SVG path:', error);
    return null;
  }
}

/**
 * Load an SVG from the public directory and return its content
 * Returns null if the file doesn't exist
 */
async function loadSvg(
  path: string,
  diagramColor: string,
): Promise<string | null> {
  if (svgCache.has(path)) {
    let svg = svgCache.get(path) ?? null;
    if (svg) {
      svg = applyColorsToSvg(svg, diagramColor);
    }
    return svg;
  }

  if (svgExistenceMap.has(path) && !svgExistenceMap.get(path)) return null;

  try {
    const response = await fetch(path);
    if (response.ok) {
      let svg = await response.text();
      svgCache.set(path, svg);
      svgExistenceMap.set(path, true);
      svg = applyColorsToSvg(svg, diagramColor);
      return svg;
    } else {
      svgExistenceMap.set(path, false);
    }
  } catch (error) {
    console.error('Error loading SVG:', error);
    svgExistenceMap.set(path, false);
  }

  return null;
}

/**
 * Compute a tight viewBox for a graphviz-generated SVG by scanning all
 * coordinate data in the AST (polygon points, path data, image/text positions).
 *
 * Graphviz SVGs have a main <g> with transform="translate(tx ty)". All child
 * coordinates are in graphviz space; adding (tx, ty) converts them to SVG space.
 * The very first child of that group is the page-background polygon, which we
 * skip so it doesn't inflate the bounding box to the full page size.
 */
function computeGraphvizViewBox(svgElement: SvgElementNode): string | null {
  // Find the main graph group that carries the coordinate transform
  const graphGroup = svgElement.children?.find(
    (n): n is SvgElementNode =>
      n.type === 'element' &&
      n.tagName === 'g' &&
      typeof (n as SvgElementNode).properties?.transform === 'string'
  );
  if (!graphGroup) return null;

  // Extract translate(tx, ty) — graphviz always emits "scale(1 1) rotate(0) translate(tx ty)"
  const transformStr = graphGroup.properties!.transform as string;
  const m = transformStr.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
  if (!m) return null;
  const tx = parseFloat(m[1]);
  const ty = parseFloat(m[2]);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  function expand(svgX: number, svgY: number) {
    if (!isFinite(svgX) || !isFinite(svgY)) return;
    if (svgX < minX) minX = svgX;
    if (svgY < minY) minY = svgY;
    if (svgX > maxX) maxX = svgX;
    if (svgY > maxY) maxY = svgY;
  }

  function walkNode(node: SvgNode) {
    if (node.type !== 'element') return;

    if (node.tagName === 'polygon') {
      // Parse "x1,y1 x2,y2 ..." or "x1 y1 x2 y2 ..."
      const nums = String(node.properties?.points ?? '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      for (let i = 0; i + 1 < nums.length; i += 2) {
        expand(nums[i] + tx, nums[i + 1] + ty);
      }
    } else if (node.tagName === 'path') {
      const d = String(node.properties?.d ?? '');
      for (const coord of d.matchAll(/([-\d.]+),([-\d.]+)/g)) {
        expand(parseFloat(coord[1]) + tx, parseFloat(coord[2]) + ty);
      }
    } else if (node.tagName === 'image') {
      const x = parseFloat(String(node.properties?.x ?? '0'));
      const y = parseFloat(String(node.properties?.y ?? '0'));
      // width/height may carry a "px" suffix — parseFloat handles that
      const w = parseFloat(String(node.properties?.width ?? '0'));
      const h = parseFloat(String(node.properties?.height ?? '0'));
      expand(x + tx, y + ty);
      expand(x + w + tx, y + h + ty);
    } else if (node.tagName === 'text') {
      const x = parseFloat(String(node.properties?.x ?? '0'));
      const y = parseFloat(String(node.properties?.y ?? '0'));
      expand(x + tx, y + ty);
    } else if (node.tagName === 'ellipse') {
      const cx = parseFloat(String(node.properties?.cx ?? '0'));
      const cy = parseFloat(String(node.properties?.cy ?? '0'));
      const rx = parseFloat(String(node.properties?.rx ?? '0'));
      const ry = parseFloat(String(node.properties?.ry ?? '0'));
      expand(cx - rx + tx, cy - ry + ty);
      expand(cx + rx + tx, cy + ry + ty);
    }

    node.children?.forEach(walkNode);
  }

  // Walk all children of the graph group.
  // Skip index 0 when it is the background polygon (full-page white rectangle).
  graphGroup.children?.forEach((child, index) => {
    if (
      index === 0 &&
      child.type === 'element' &&
      (child as SvgElementNode).tagName === 'polygon'
    ) {
      return;
    }
    walkNode(child);
  });

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  const pad = 8;
  return `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
}

function svgToReactNode(
  svg: string,
  props?: React.SVGProps<SVGSVGElement>,
  loadedSvgs?: Map<string, React.ReactNode>,
  highlightedNodeNames?: Set<string>,
  adjustViewBox = false,
  onNodeClick?: NodeClickHandler,
  activePingNodeNames?: Set<string>,
  onNodeMiddleClick?: NodeClickHandler,
  highlightedEntityColor?: string
): React.ReactNode {
  if (!svg.trim().startsWith('<')) return null;

  const ast = parse(svg) as SvgRootNode;

  const svgElement = ast.children.find(
    (n): n is SvgElementNode => n.type === 'element' && n.tagName === 'svg'
  );

  if (!svgElement) return null;

  // Ensure the main SVG element scales to fit its container
  if (adjustViewBox && svgElement.properties) {
    svgElement.properties.width = '100%';
    svgElement.properties.height = '100%';

    const tightViewBox = computeGraphvizViewBox(svgElement);
    if (tightViewBox) {
      svgElement.properties.viewBox = tightViewBox;
    }
  }

  // Build a set of image positions (x,y) that should be highlighted
  const highlightedPositions = new Set<string>();
  if (highlightedNodeNames) {
    for (const name of highlightedNodeNames) {
      const imageNodes = findImagesByLabel(ast, name);
      for (const imageNode of imageNodes) {
        const x = imageNode.properties?.x;
        const y = imageNode.properties?.y;
        if (x !== undefined && y !== undefined) {
          highlightedPositions.add(`${x},${y}`);
        }
      }
    }
  }

  return renderNode(
    {
      ...svgElement,
      properties: {
        xmlns: 'http://www.w3.org/2000/svg',
        ...svgElement.properties,
        ...props,
      },
    },
    undefined,
    loadedSvgs,
    highlightedPositions,
    onNodeClick,
    activePingNodeNames,
    onNodeMiddleClick,
    highlightedEntityColor
  );
}

function renderNode(
  node: SvgNode,
  key?: React.Key,
  loadedSvgs?: Map<string, React.ReactNode>,
  highlightedPositions?: Set<string>,
  onNodeClick?: NodeClickHandler,
  activePingNodeNames?: Set<string>,
  onNodeMiddleClick?: NodeClickHandler,
  highlightedEntityColor?: string
): React.ReactNode {
  if (node.type === 'text') {
    return decodeXmlEntities(node.value);
  }

  // Each <a> element (a kubernetes resource node) becomes its own React component
  if (node.tagName === 'a') {
    return React.createElement(KubeDiagramNode, {
      key,
      node,
      loadedSvgs,
      highlightedPositions,
      onNodeClick,
      activePingNodeNames,
      onNodeMiddleClick,
      highlightedEntityColor
    });
  }

  // Replace image with inlined SVG (if it exists)
  if (
    node.tagName === 'image' &&
    (node.properties?.href || node.properties?.['xlink:href'])
  ) {
    const href = node.properties?.href || node.properties?.['xlink:href'];
    const localPath = getLocalSvgPath(href);

    if (localPath && loadedSvgs?.has(localPath)) {
      const normalizedProps = normalizeSvgProps(node.properties);
      const x = normalizedProps.x || node.properties.x || 0;
      const y = normalizedProps.y || node.properties.y || 0;
      const width = normalizedProps.width || node.properties.width;
      const height = normalizedProps.height || node.properties.height;

      // Check if this specific image should be highlighted using its position
      // Position (x,y) is unique per node, while localPath is shared across node types
      const positionKey = `${x},${y}`;
      const isHighlighted = highlightedPositions?.has(positionKey);
      const highlightedKey = `${localPath}#highlighted`;
      const svgNode =
        isHighlighted && loadedSvgs.has(highlightedKey)
          ? loadedSvgs.get(highlightedKey)
          : loadedSvgs.get(localPath);

      const svgProps: Record<string, any> =
        (svgNode as React.ReactElement)?.props || {};
      const existingStyle =
        svgProps.style && typeof svgProps.style === 'object'
          ? svgProps.style
          : {};
      const svgElement = svgNode as React.ReactElement;

      return React.createElement(
        'g',
        {
          key,
          transform: `translate(${x}, ${y})`,
        },
        React.createElement(
          svgElement.type as React.ElementType,
          {
            ...(typeof svgElement.props === 'object' ? svgElement.props : {}),
            width,
            height,
            style: {
              overflow: 'visible',
              ...existingStyle,
            },
          } as any,
          (svgElement.props as any)?.children
        )
      );
    }
  }

  return React.createElement(
    node.tagName,
    { ...normalizeSvgProps(node.properties), key },
    node.children?.map((child, index) =>
      renderNode(
        child, 
        index, 
        loadedSvgs, 
        highlightedPositions, 
        onNodeClick, 
        activePingNodeNames, 
        onNodeMiddleClick, 
        highlightedEntityColor)
    )
  );
}

function normalizeSvgProps(
  props: Record<string, any> = {}
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    // Skip attributes with namespace prefixes (colons) except for known React SVG namespaces
    if (key.includes(':')) {
      if (key === 'xlink:href' || key === 'xlink:title') {
        // Handle these below, but allow them through
      } else {
        // Skip all other namespaced attributes (inkscape:*, sodipodi:*, etc.)
        continue;
      }
    }

    if (key === 'class') {
      normalized.className = value;
    } else if (key === 'style') {
      // Ensure style is always an object, not a string
      if (typeof value === 'string') {
        try {
          const styleObj: Record<string, string> = {};
          value.split(';').forEach((declaration) => {
            const [prop, val] = declaration.split(':');
            if (prop && val) {
              const camelProp = prop
                .trim()
                .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              styleObj[camelProp] = val.trim();
            }
          });
          normalized.style = styleObj;
        } catch {
          // If parsing fails, skip the style
          normalized.style = {};
        }
      } else if (typeof value === 'object') {
        normalized.style = value;
      }
    } else if (key === 'xlink:href' || key === 'xlinkHref') {
      normalized.href = value;
    } else if (key === 'xlink:title') {
      normalized.xlinkTitle = value;
    } else if (key.includes('-')) {
      normalized[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

function decodeXmlEntities(value: string): string {
  if (!value.includes('&')) return value;

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function decodeHtmlEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code))
  );
}

function collectTextFromAnchor(anchor: SvgElementNode): string {
  if (!anchor.children) return '';

  return anchor.children
    .filter(
      (child): child is SvgElementNode =>
        child.type === 'element' && child.tagName === 'text'
    )
    .map((textElement) => {
      const textNode = textElement.children?.find(
        (c): c is SvgTextNode => c.type === 'text'
      );

      return textNode ? decodeHtmlEntities(textNode.value) : '';
    })
    .join('');
}

function findImagesByLabel(
  root: SvgRootNode,
  target: string
): SvgElementNode[] {
  const results: SvgElementNode[] = [];

  function walk(node: SvgNode) {
    if (node.type === 'element') {
      if (node.tagName === 'a') {
        const label = collectTextFromAnchor(node);

        if (label === target) {
          const imageNode = node.children?.find(
            (c): c is SvgElementNode =>
              c.type === 'element' && c.tagName === 'image'
          );
          if (imageNode) {
            results.push(imageNode);
          }
        }
      }

      node.children?.forEach(walk);
    }
  }

  root.children.forEach(walk);

  return results;
}

/**
 * Apply colors to SVG content by replacing fill and stroke attributes
 */
function applyColorsToSvg(
  svgContent: string,
  diagramColor: string,
): string {
  let modified = svgContent;

  // Replace blue with the chosen background color
  modified = modified.replace(
    /#326[cC][eE]5[0-9a-fA-F]{0,2}|rgb\s*\(\s*50\s*,\s*108\s*,\s*229\s*\)/gi,
    diagramColor
  );

  return modified;
}

/**
 * Extract all unique local SVG paths from an SVG AST
 */
function extractLocalSvgPaths(
  node: SvgNode,
  paths = new Set<string>()
): Set<string> {
  if (node.type === 'element') {
    if (
      node.tagName === 'image' &&
      (node.properties?.href || node.properties?.['xlink:href'])
    ) {
      const href = node.properties?.href || node.properties?.['xlink:href'];
      const localPath = getLocalSvgPath(href);
      if (localPath) {
        paths.add(localPath);
      }
    }
    node.children?.forEach((child) => extractLocalSvgPaths(child, paths));
  }
  return paths;
}

/**
 * Preload all local SVGs and convert them to React nodes
 * Loads both standard and highlighted versions
 */
async function preloadLocalSvgs(
  node: SvgNode,
  diagramColor: string,
  highlightedEntityColor: string,
): Promise<Map<string, React.ReactNode>> {
  const paths = extractLocalSvgPaths(node);
  const loadedSvgs = new Map<string, React.ReactNode>();

  // Load standard versions
  const standardResults = await Promise.all(
    Array.from(paths).map((path) =>
      loadSvg(path, diagramColor)
    )
  );

  // Load highlighted versions
  const highlightedResults = await Promise.all(
    Array.from(paths).map((path) =>
      loadSvg(path, highlightedEntityColor)
    )
  );

  Array.from(paths).forEach((path, index) => {
    // Store standard version
    const standardContent = standardResults[index];
    if (standardContent) {
      const reactNode = svgToReactNode(standardContent);
      if (reactNode) {
        loadedSvgs.set(path, reactNode);
      }
    }

    // Store highlighted version with special key
    const highlightedContent = highlightedResults[index];
    if (highlightedContent) {
      const reactNode = svgToReactNode(highlightedContent);
      if (reactNode) {
        loadedSvgs.set(`${path}#highlighted`, reactNode);
      }
    }
  });

  return loadedSvgs;
}

function KubeDiagramNode({
  node,
  loadedSvgs,
  highlightedPositions,
  onNodeClick,
  activePingNodeNames,
  onNodeMiddleClick,
  highlightedEntityColor,
}: {
  node: SvgElementNode;
  loadedSvgs?: Map<string, React.ReactNode>;
  highlightedPositions?: Set<string>;
  onNodeClick?: NodeClickHandler;
  activePingNodeNames?: Set<string>;
  onNodeMiddleClick?: NodeClickHandler;
  highlightedEntityColor?: string;
}) {
  const nodeName = collectTextFromAnchor(node);
  const normalizedProps = normalizeSvgProps(node.properties);
  const existingStyle =
    typeof normalizedProps.style === 'object' ? normalizedProps.style : {};

  const isPinged = nodeName ? (activePingNodeNames?.has(nodeName) ?? false) : false;

  // Locate the <image> child to derive its center for the ping overlay
  const imageChild = node.children?.find(
    (c): c is SvgElementNode => c.type === 'element' && c.tagName === 'image'
  );
  const imgNorm = imageChild ? normalizeSvgProps(imageChild.properties) : {};
  const ix = parseFloat(String(imgNorm.x ?? imageChild?.properties?.x ?? 0)) || 0;
  const iy = parseFloat(String(imgNorm.y ?? imageChild?.properties?.y ?? 0)) || 0;
  const iw = parseFloat(String(imgNorm.width ?? imageChild?.properties?.width ?? 50)) || 50;
  const ih = parseFloat(String(imgNorm.height ?? imageChild?.properties?.height ?? 50)) || 50;
  const cx = ix + iw / 2;
  const cy = iy + ih / 2;
  const r = Math.max(iw, ih) / 2;

  // Ping overlay: only rendered while isPinged; CSS animation handles the pulse effect
  const pingOverlay =
    isPinged && imageChild
      ? React.createElement('circle', {
          cx,
          cy,
          r,
          fill: 'none',
          stroke: highlightedEntityColor || '#ff5151',
          strokeWidth: 3,
          className: 'kube-ping-circle',
          style: { pointerEvents: 'none' },
        })
      : null;

  const children = [
    ...(node.children?.map((child, index) =>
      renderNode(
        child, 
        index, 
        loadedSvgs, 
        highlightedPositions, 
        onNodeClick, 
        activePingNodeNames, 
        onNodeMiddleClick,
        highlightedEntityColor)
    ) ?? []),
    pingOverlay,
  ];

  return React.createElement(
    node.tagName,
    {
      ...normalizedProps,
      onClick: nodeName ? () => onNodeClick?.(nodeName) : undefined,
      onMouseDown: nodeName
        ? (e: React.MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              onNodeMiddleClick?.(nodeName);
            }
          }
        : undefined,
      style: nodeName
        ? { cursor: 'pointer', ...existingStyle }
        : normalizedProps.style,
    },
    ...children
  );
}

function DiagramGeneratorMenu({
  onGenerate,
  isRunning,
}: {
  onGenerate: (type: DiagramType, path?: string, file?: File) => void;
  isRunning: boolean;
}) {
  const [type, setType] = useState<DiagramType>('manifest');
  const [path, setPath] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    onGenerate(type, path || undefined, file || undefined);
    // Clear file after generate to make both options usable again
    if (file) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #ccc' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DiagramType)}
        >
          <option value="manifest">Manifest</option>
          <option value="kustomize">Kustomize</option>
          <option value="helmfile">Helmfile</option>
        </select>

        <input
          placeholder="Path"
          value={path}
          disabled={!!file}
          onChange={(e) => setPath(e.target.value)}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] ?? null;
            setFile(selectedFile);
            if (selectedFile) {
              setPath('');
            }
          }}
        />

        <button
          disabled={isRunning || (!path && !file)}
          onClick={handleGenerate}
        >
          {isRunning ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

// Optional: Display color picker above diagram for easy access
function ColorPickerSection() {
  return (
    <div
      style={{
        padding: 12,
        borderBottom: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="k8sDiagramColor" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="highlightedEntityColor" />
      </div>
    </div>
  );
}

type DiagramPageProps = React.SVGProps<SVGSVGElement> & {
  onNodeClick?: NodeClickHandler;
};

export default function DiagramPage({ onNodeClick, ...props }: DiagramPageProps) {
  const { generate, svg, isRunning, error } = useDiagramGenerator();
  const [persistedSvg] = useState<string | null>(() =>
    localStorage.getItem('generated-diagram-svg')
  );
  const [loadedSvgs, setLoadedSvgs] = useState<Map<string, React.ReactNode>>(
    () => new Map()
  );
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Measure how much vertical space the diagram has from its own top edge to the
  // bottom of the viewport.  We re-measure whenever the options panel is toggled
  // (which changes the wrapper's top position) and whenever the window resizes.
  const diagramRef = useRef<HTMLDivElement>(null);
  const [diagramHeight, setDiagramHeight] = useState(400);
  useLayoutEffect(() => {
    const measure = () => {
      if (!diagramRef.current) return;
      const top = diagramRef.current.getBoundingClientRect().top;
      setDiagramHeight(Math.max(window.innerHeight - top - 8, 80));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [optionsOpen]);

  const getAllApplications = useModelStore((state) => state.getAllApplications);
  const highlightedEntityIds = useVisualizationStore(
    (state) => state.highlightedEntityIds
  );
  const setHighlightedEntityId = useVisualizationStore(
    (state) => state.actions.setHighlightedEntityId
  );

  const [localHighlightedNodeNames, setLocalHighlightedNodeNames] = useState<Set<string>>(() => new Set());

  const highlightedNodeNames = useMemo(() => {
    const names = new Set<string>(localHighlightedNodeNames);
    const allApps = getAllApplications();
    for (const app of allApps) {
      if (highlightedEntityIds.has(app.id)) {
        names.add(app.name);
      }
    }
    return names;
  }, [getAllApplications, highlightedEntityIds, localHighlightedNodeNames]);

  const handleNodeClick = useCallback(
    (nodeName: string) => {
      const matchingApp = getAllApplications().find(
        (app) => app.name === nodeName
      );
      if (matchingApp) {
        setHighlightedEntityId(
          matchingApp.id,
          !highlightedEntityIds.has(matchingApp.id)
        );
      } else {
        // No matching canvas application — highlight the sidebar node only
        setLocalHighlightedNodeNames((prev) => {
          const next = new Set(prev);
          if (next.has(nodeName)) {
            next.delete(nodeName);
          } else {
            next.add(nodeName);
          }
          return next;
        });
      }
    },
    [getAllApplications, highlightedEntityIds, setHighlightedEntityId]
  );

  const activePingNodeNames = usePingStore((state) => state.activePingNodeNames);

  const handleNodeMiddleClick = useCallback(
    (nodeName: string) => {
      const DURATION_MS = 3000;
      const matchingApp = getAllApplications().find(
        (app) => app.name === nodeName
      );
      if (matchingApp) {
        // pingByModelId internally adds to the ping store and animates the 3D canvas
        pingByModelId(matchingApp.id, false, { durationMs: DURATION_MS });
      } else {
        // No matching canvas application — ping the sidebar node only
        usePingStore.getState().addPing(nodeName, DURATION_MS);
      }
    },
    [getAllApplications]
  );

  const diagramColor = useUserSettingsStore(
    (state) =>
      state.visualizationSettings.k8sDiagramColor?.value ?? '#326ce5'
  );

  const highlightedEntityColor = useUserSettingsStore(
    (state) => state.visualizationSettings.highlightedEntityColor?.value ??
      '#ff5151'
  );

  useEffect(() => {
    if (svg) {
      localStorage.setItem('generated-diagram-svg', svg);
    }
  }, [svg]);

  const effectiveSvg = svg ?? persistedSvg;

  useEffect(() => {
    if (!effectiveSvg) {
      return;
    }

    const loadSvgs = async () => {
      try {
        const ast = parse(effectiveSvg) as SvgRootNode;
        const svgElement = ast.children.find(
          (n): n is SvgElementNode =>
            n.type === 'element' && n.tagName === 'svg'
        );
        if (svgElement) {
          const loaded = await preloadLocalSvgs(
            svgElement,
            diagramColor,
            highlightedEntityColor
          );
          setLoadedSvgs(loaded);
        }
      } catch (error) {
        console.error('Error preloading SVGs:', error);
      }
    };

    loadSvgs();
  }, [
    effectiveSvg,
    diagramColor,
    highlightedEntityColor
  ]);

  const svgElement = useMemo<React.ReactNode>(() => {
    if (!effectiveSvg) return null;
    return svgToReactNode(
      effectiveSvg,
      props,
      loadedSvgs,
      highlightedNodeNames,
      true, // adjustViewBox
      onNodeClick ?? handleNodeClick,
      activePingNodeNames,
      handleNodeMiddleClick,
      highlightedEntityColor
    );
  }, [
    effectiveSvg, 
    props, 
    loadedSvgs, 
    highlightedNodeNames, 
    onNodeClick, 
    handleNodeClick, 
    activePingNodeNames, 
    handleNodeMiddleClick, 
    highlightedEntityColor
  ]);

  async function onGenerate(type: DiagramType, path?: string, file?: File) {
    await generate({ type, path, file });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <button
        onClick={() => setOptionsOpen(!optionsOpen)}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: '1px solid #ccc'
        }}
      >
        <span>{optionsOpen ? '▼' : '▶'}</span>
        <span>Options</span>
      </button>

      {optionsOpen && (
        <>
          <DiagramGeneratorMenu onGenerate={onGenerate} isRunning={isRunning} />
          <ColorPickerSection />
        </>
      )}

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div ref={diagramRef} style={{ height: diagramHeight, overflow: 'hidden' }}>
        <style>{`
          @keyframes kube-ping-pulse {
            0%   { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.7); opacity: 0;   }
          }
          .kube-ping-circle {
            animation: kube-ping-pulse 1s ease-out 3 forwards;
            transform-box: fill-box;
            transform-origin: center;
            pointer-events: none;
          }
        `}</style>
        {svgElement ?? (
          <div style={{ padding: 16, color: '#666' }}>
            No diagram generated yet
          </div>
        )}
      </div>
    </div>
  );
}
