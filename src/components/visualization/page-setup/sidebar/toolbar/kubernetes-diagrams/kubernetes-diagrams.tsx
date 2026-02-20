import React, { useEffect, useMemo, useState } from 'react';
import { parse } from 'svg-parser';
import {
  DiagramType,
  useDiagramGenerator,
} from '../../../../../../hooks/useDiagramGenerator';
import { useModelStore } from '../../../../../../stores/repos/model-repository';
import { useUserSettingsStore } from '../../../../../../stores/user-settings';
import { useVisualizationStore } from '../../../../../../stores/visualization-store';
import ColorPicker from '../../customizationbar/settings/color-picker';

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

// Cache for loaded SVGs
const svgCache = new Map<string, string>();
const svgExistenceMap = new Map<string, boolean>();

/**
 * Extract filename from image URL and map it to local SVG path
 * e.g., "https://.../sts.png" -> "/images/kubeDiagrams/svg/sts.svg"
 */
function getLocalSvgPath(imageHref: string): string | null {
  try {
    const match = imageHref.match(/\/([^/]+\.png)$/);
    if (!match) return null;
    const filename = match[1];
    const svgFilename = filename.replace('.png', '.svg');
    return `/images/kubeDiagrams/svg/${svgFilename}`;
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
  foregroundColor: string,
  backgroundColor: string
): Promise<string | null> {
  if (svgCache.has(path)) {
    let svg = svgCache.get(path) ?? null;
    if (svg) {
      svg = applyColorsToSvg(svg, foregroundColor, backgroundColor);
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
      svg = applyColorsToSvg(svg, foregroundColor, backgroundColor);
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

function correctViewBox(viewBox: string): string {
  return "test";
}

function svgToReactNode(
  svg: string,
  props?: React.SVGProps<SVGSVGElement>,
  loadedSvgs?: Map<string, React.ReactNode>,
  highlightedNodeNames?: Set<string>,
  adjustViewBox = false
): React.ReactNode {
  if (!svg.trim().startsWith('<')) return null;

  const ast = parse(svg) as SvgRootNode;

  const svgElement = ast.children.find(
    (n): n is SvgElementNode => n.type === 'element' && n.tagName === 'svg'
  );

  if (!svgElement) return null;

  // Ensure the main SVG element scales to fit its container
  if (adjustViewBox && svgElement.properties) {
      svgElement.properties.width = 'auto';
      svgElement.properties.height = 'auto';

      // hardcoded adjustments to minimize whitespace in SVG // TODO: automatic calculation of ideal values
      let viewBox = svgElement.properties.viewBox.split(' ').map(Number);
      viewBox[0] += 150;
      viewBox[1] += 140;
      viewBox[3] -= 280;
      svgElement.properties.viewBox = viewBox.join(' ');
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
    highlightedPositions
  );
}

function renderNode(
  node: SvgNode,
  key?: React.Key,
  loadedSvgs?: Map<string, React.ReactNode>,
  highlightedPositions?: Set<string>
): React.ReactNode {
  if (node.type === 'text') {
    return decodeXmlEntities(node.value);
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
      renderNode(child, index, loadedSvgs, highlightedPositions)
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
  foregroundColor: string,
  backgroundColor: string
): string {
  let modified = svgContent;

  // Replace white with the chosen foreground color
  modified = modified.replace(
    /#[fF]{3}(?![0-9a-fA-F])|#[fF]{6}(?![0-9a-fA-F])|rgb\s*\(\s*255\s*,\s*255\s*,\s*255\s*\)|white/gi,
    foregroundColor
  );

  // Replace blue with the chosen background color
  modified = modified.replace(
    /#326[cC][eE]5[0-9a-fA-F]{0,2}|rgb\s*\(\s*50\s*,\s*108\s*,\s*229\s*\)/gi,
    backgroundColor
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
  foregroundColor: string,
  backgroundColor: string,
  highlightForegroundColor: string,
  highlightBackgroundColor: string
): Promise<Map<string, React.ReactNode>> {
  const paths = extractLocalSvgPaths(node);
  const loadedSvgs = new Map<string, React.ReactNode>();

  // Load standard versions
  const standardResults = await Promise.all(
    Array.from(paths).map((path) =>
      loadSvg(path, foregroundColor, backgroundColor)
    )
  );

  // Load highlighted versions
  const highlightedResults = await Promise.all(
    Array.from(paths).map((path) =>
      loadSvg(path, highlightForegroundColor, highlightBackgroundColor)
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

// Optional: Display color picker above diagram for easy access (also accessible in settings)
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
        <ColorPicker id="k8sDiagramForegroundColor" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="k8sDiagramBackgroundColor" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="k8sDiagramHighlightForegroundColor" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker id="k8sDiagramHighlightBackgroundColor" />
      </div>
    </div>
  );
}

export default function DiagramPage(props: React.SVGProps<SVGSVGElement>) {
  const { generate, svg, isRunning, error } = useDiagramGenerator();
  const [persistedSvg] = useState<string | null>(() =>
    localStorage.getItem('generated-diagram-svg')
  );
  const [loadedSvgs, setLoadedSvgs] = useState<Map<string, React.ReactNode>>(
    () => new Map()
  );

  const getAllApplications = useModelStore((state) => state.getAllApplications);
  const highlightedEntityIds = useVisualizationStore(
    (state) => state.highlightedEntityIds
  );

  useEffect(() => {
    for (const app of getAllApplications()) {
      console.log(
        'Application: ' +
          app.name +
          ', highlighted: ' +
          highlightedEntityIds.has(app.id)
      );
    }
  }, [getAllApplications, highlightedEntityIds]);

  const highlightedNodeNames = useMemo(() => {
    const names = new Set<string>();
    const allApps = getAllApplications();
    for (const app of allApps) {
      if (highlightedEntityIds.has(app.id)) {
        names.add(app.name);
      }
    }
    return names;
  }, [getAllApplications, highlightedEntityIds]);

  const foregroundColor = useUserSettingsStore(
    (state) =>
      state.visualizationSettings.k8sDiagramForegroundColor?.value ?? '#ffffff'
  );
  const backgroundColor = useUserSettingsStore(
    (state) =>
      state.visualizationSettings.k8sDiagramBackgroundColor?.value ?? '#326ce5'
  );
  const highlightForegroundColor = useUserSettingsStore(
    (state) =>
      state.visualizationSettings.k8sDiagramHighlightForegroundColor?.value ??
      '#d3d3d3'
  );
  const highlightBackgroundColor = useUserSettingsStore(
    (state) =>
      state.visualizationSettings.k8sDiagramHighlightBackgroundColor?.value ??
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
        console.log('Parsed SVG AST:', ast);
        const svgElement = ast.children.find(
          (n): n is SvgElementNode =>
            n.type === 'element' && n.tagName === 'svg'
        );
        if (svgElement) {
          const loaded = await preloadLocalSvgs(
            svgElement,
            foregroundColor,
            backgroundColor,
            highlightForegroundColor,
            highlightBackgroundColor
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
    foregroundColor,
    backgroundColor,
    highlightForegroundColor,
    highlightBackgroundColor,
  ]);

  const svgElement = useMemo<React.ReactNode>(() => {
    if (!effectiveSvg) return null;
    return svgToReactNode(
      effectiveSvg,
      props,
      loadedSvgs,
      highlightedNodeNames,
      true // adjustViewBox
    );
  }, [effectiveSvg, props, loadedSvgs, highlightedNodeNames]);

  async function onGenerate(type: DiagramType, path?: string, file?: File) {
    await generate({ type, path, file });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DiagramGeneratorMenu onGenerate={onGenerate} isRunning={isRunning} />

      <ColorPickerSection />

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {svgElement ?? (
          <div style={{ padding: 16, color: '#666' }}>
            No diagram generated yet
          </div>
        )}
      </div>
    </div>
  );
}
