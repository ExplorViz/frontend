import type React from 'react';
import { parse } from 'svg-parser';
import type { SvgElementNode, SvgNode, SvgRootNode } from './types';

// Cache for loaded SVGs
const svgCache = new Map<string, string>();
const svgExistenceMap = new Map<string, boolean>();

/**
 * Extract filename from image URL and map it to local SVG path
 * e.g., "https://.../sts.png" -> "/images/kubeDiagrams/sts.svg"
 */
export function getLocalSvgPath(imageHref: string): string | null {
  const match = imageHref.match(/\/([^/]+\.png)$/);
  return match ? `/images/kubeDiagrams/${match[1].replace('.png', '.svg')}` : null;
}

/**
 * Load an SVG from the public directory and return its content.
 * Returns null if the file doesn't exist.
 */
export async function loadSvg(
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
export function computeGraphvizViewBox(svgElement: SvgElementNode): string | null {
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

export function normalizeSvgProps(
  props: Record<string, any> = {}
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    // Skip namespaced attributes except the two xlink ones handled below
    if (key.includes(':') && key !== 'xlink:href' && key !== 'xlink:title') continue;

    if (key === 'class') {
      normalized.className = value;
    } else if (key === 'style') {
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

export function decodeXmlEntities(value: string): string {
  if (!value.includes('&')) return value;

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

export function decodeHtmlEntities(str: string): string {
  return str.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(Number(code))
  );
}

export function collectTextFromAnchor(anchor: SvgElementNode): string {
  if (!anchor.children) return '';

  return anchor.children
    .filter(
      (child): child is SvgElementNode =>
        child.type === 'element' && child.tagName === 'text'
    )
    .map((textElement) => {
      const textNode = textElement.children?.find(
        (c): c is { type: 'text'; value: string } => c.type === 'text'
      );
      return textNode ? decodeHtmlEntities(textNode.value) : '';
    })
    .join('');
}

export function findImagesByLabel(
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

/** Apply colors to SVG content by replacing the Kubernetes blue fill/stroke. */
export function applyColorsToSvg(
  svgContent: string,
  diagramColor: string,
): string {
  return svgContent.replace(
    /#326[cC][eE]5[0-9a-fA-F]{0,2}|rgb\s*\(\s*50\s*,\s*108\s*,\s*229\s*\)/gi,
    diagramColor
  );
}

/** Extract all unique local SVG paths referenced by <image> elements in the AST. */
export function extractLocalSvgPaths(
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
 * Preload all local SVGs referenced in the diagram and convert them to React nodes.
 * Loads both standard (diagramColor) and highlighted (highlightedEntityColor) versions.
 *
 * @param toReactNode - injected converter to avoid a circular import with svg-renderer
 */
export async function preloadLocalSvgs(
  node: SvgNode,
  diagramColor: string,
  highlightedEntityColor: string,
  toReactNode: (svg: string) => React.ReactNode,
): Promise<Map<string, React.ReactNode>> {
  const paths = extractLocalSvgPaths(node);
  const loadedSvgs = new Map<string, React.ReactNode>();

  const [standardResults, highlightedResults] = await Promise.all([
    Promise.all(Array.from(paths).map((path) => loadSvg(path, diagramColor))),
    Promise.all(Array.from(paths).map((path) => loadSvg(path, highlightedEntityColor))),
  ]);

  Array.from(paths).forEach((path, index) => {
    const standardContent = standardResults[index];
    if (standardContent) {
      const reactNode = toReactNode(standardContent);
      if (reactNode) loadedSvgs.set(path, reactNode);
    }

    const highlightedContent = highlightedResults[index];
    if (highlightedContent) {
      const reactNode = toReactNode(highlightedContent);
      if (reactNode) loadedSvgs.set(`${path}#highlighted`, reactNode);
    }
  });

  return loadedSvgs;
}

/**
 * Parse an SVG string and return the root <svg> element node from the AST,
 * or null if none is found.
 */
export function parseSvgElement(svgString: string): SvgElementNode | null {
  const ast = parse(svgString) as SvgRootNode;
  return (
    ast.children.find(
      (n): n is SvgElementNode => n.type === 'element' && n.tagName === 'svg'
    ) ?? null
  );
}
