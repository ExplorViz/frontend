import React from 'react';
import { parse } from 'svg-parser';
import {
  collectTextFromAnchor,
  computeGraphvizViewBox,
  decodeXmlEntities,
  findImagesByLabel,
  getLocalSvgPath,
  normalizeSvgProps,
} from './svg-utils';
import type {
  DiagramRenderContext,
  SvgElementNode,
  SvgNode,
  SvgRootNode,
} from './types';

/**
 * Convert an SVG string into a React node tree, optionally adjusting the viewBox
 * to tightly fit the diagram content.
 */
export function svgToReactNode(
  svg: string,
  props?: React.SVGProps<SVGSVGElement>,
  ctx?: DiagramRenderContext,
  adjustViewBox = false,
): React.ReactNode {
  if (!svg.trim().startsWith('<')) return null;

  const ast = parse(svg) as SvgRootNode;
  const svgElement = ast.children.find(
    (n): n is SvgElementNode => n.type === 'element' && n.tagName === 'svg'
  );
  if (!svgElement) return null;

  if (adjustViewBox && svgElement.properties) {
    svgElement.properties.width = '100%';
    svgElement.properties.height = '100%';
    const tightViewBox = computeGraphvizViewBox(svgElement);
    if (tightViewBox) {
      svgElement.properties.viewBox = tightViewBox;
    }
  }

  // Build a set of image positions (x,y) for nodes that should be highlighted.
  // Position is used as the key because the same icon SVG is shared across node types.
  const highlightedPositions = new Set<string>();
  if (ctx?.highlightedPositions) {
    // highlightedPositions is already computed by the caller from highlightedNodeNames
    // We pass it through directly in the context
  }

  // Resolve highlighted positions from node names if we have the AST and names
  const resolvedPositions = ctx?.highlightedPositions ?? new Set<string>();

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
    ctx ? { ...ctx, highlightedPositions: resolvedPositions } : undefined,
  );
}

/**
 * Build highlighted positions from a set of node names by scanning the SVG AST.
 * Call this before svgToReactNode to populate DiagramRenderContext.highlightedPositions.
 */
export function buildHighlightedPositions(
  svg: string,
  highlightedNodeNames: Set<string>,
): Set<string> {
  if (highlightedNodeNames.size === 0) return new Set();

  const ast = parse(svg) as SvgRootNode;
  const positions = new Set<string>();

  for (const name of highlightedNodeNames) {
    const imageNodes = findImagesByLabel(ast, name);
    for (const imageNode of imageNodes) {
      const x = imageNode.properties?.x;
      const y = imageNode.properties?.y;
      if (x !== undefined && y !== undefined) {
        positions.add(`${x},${y}`);
      }
    }
  }

  return positions;
}

function renderNode(
  node: SvgNode,
  key?: React.Key,
  ctx?: DiagramRenderContext,
): React.ReactNode {
  if (node.type === 'text') {
    return decodeXmlEntities(node.value);
  }

  // Each <a> element (a kubernetes resource node) becomes its own React component
  if (node.tagName === 'a') {
    return React.createElement(KubeDiagramNode, {
      key,
      node,
      ctx: ctx ?? {
        loadedSvgs: new Map(),
        highlightedPositions: new Set(),
      },
    });
  }

  // Replace <image> with inlined SVG (if a local version exists)
  if (
    node.tagName === 'image' &&
    (node.properties?.href || node.properties?.['xlink:href'])
  ) {
    const href = node.properties?.href || node.properties?.['xlink:href'];
    const localPath = getLocalSvgPath(href);

    if (localPath && ctx?.loadedSvgs?.has(localPath)) {
      const normalizedProps = normalizeSvgProps(node.properties);
      const x = normalizedProps.x || node.properties!.x || 0;
      const y = normalizedProps.y || node.properties!.y || 0;
      const width = normalizedProps.width || node.properties!.width;
      const height = normalizedProps.height || node.properties!.height;

      const positionKey = `${x},${y}`;
      const isHighlighted = ctx.highlightedPositions?.has(positionKey);
      const highlightedKey = `${localPath}#highlighted`;
      const svgNode =
        isHighlighted && ctx.loadedSvgs.has(highlightedKey)
          ? ctx.loadedSvgs.get(highlightedKey)
          : ctx.loadedSvgs.get(localPath);

      const svgProps: Record<string, any> =
        (svgNode as React.ReactElement)?.props || {};
      const existingStyle =
        svgProps.style && typeof svgProps.style === 'object'
          ? svgProps.style
          : {};
      const svgElement = svgNode as React.ReactElement;

      return React.createElement(
        'g',
        { key, transform: `translate(${x}, ${y})` },
        React.createElement(
          svgElement.type as React.ElementType,
          {
            ...(typeof svgElement.props === 'object' ? svgElement.props : {}),
            width,
            height,
            style: { overflow: 'visible', ...existingStyle },
          } as any,
          (svgElement.props as any)?.children
        )
      );
    }
  }

  return React.createElement(
    node.tagName,
    { ...normalizeSvgProps(node.properties), key },
    node.children?.map((child, index) => renderNode(child, index, ctx))
  );
}

/**
 * Renders a single Kubernetes resource node (an <a> element in the graphviz SVG).
 * Handles click/middle-click events, highlighted state, and ping animation overlay.
 *
 * Kept in svg-renderer.tsx alongside renderNode because the two are mutually recursive —
 * renderNode creates KubeDiagramNode elements and KubeDiagramNode calls renderNode for
 * its children. Separating them would create a circular import.
 */
function KubeDiagramNode({
  node,
  ctx,
}: {
  node: SvgElementNode;
  ctx: DiagramRenderContext;
}) {
  const nodeName = collectTextFromAnchor(node);
  const normalizedProps = normalizeSvgProps(node.properties);
  const existingStyle =
    typeof normalizedProps.style === 'object' ? normalizedProps.style : {};

  const isPinged = nodeName ? (ctx.activePingNodeNames?.has(nodeName) ?? false) : false;

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

  const pingOverlay =
    isPinged && imageChild
      ? React.createElement('circle', {
          cx,
          cy,
          r,
          fill: 'none',
          stroke: ctx.highlightedEntityColor || '#ff5151',
          strokeWidth: 3,
          className: 'kube-ping-circle',
          style: { pointerEvents: 'none' },
        })
      : null;

  const children = [
    ...(node.children?.map((child, index) =>
      renderNode(child, index, ctx)
    ) ?? []),
    pingOverlay,
  ];

  return React.createElement(
    node.tagName,
    {
      ...normalizedProps,
      'data-node-name': nodeName || undefined,
      onClick: nodeName ? () => ctx.onNodeClick?.(nodeName) : undefined,
      onMouseDown: nodeName
        ? (e: React.MouseEvent) => {
            if (e.button === 1) {
              e.preventDefault();
              ctx.onNodeMiddleClick?.(nodeName);
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
