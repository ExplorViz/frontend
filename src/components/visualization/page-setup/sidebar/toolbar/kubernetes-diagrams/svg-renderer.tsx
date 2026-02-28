import React from 'react';
import { parse } from 'svg-parser';
import { KubeDiagramNode } from './kube-diagram-node';
import {
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
 *
 * @param svg           Raw SVG markup string
 * @param props         Extra props merged onto the root <svg> element
 * @param ctx           Rendering context (loaded icon SVGs, highlighting, interaction handlers)
 * @param adjustViewBox When true, replaces the viewBox with a tight fit around diagram content
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
    ctx,
  );
}

/**
 * Resolve a set of node names to their corresponding image positions in the SVG AST.
 * Call this before svgToReactNode to populate DiagramRenderContext.highlightedPositions.
 *
 * Position strings ("x,y") are unique per node instance and are used to look up
 * which <image> elements should render the highlighted icon variant.
 */
export function buildHighlightedPositions(
  svg: string,
  highlightedNodeNames: Set<string>,
): Set<string> {
  if (highlightedNodeNames.size === 0) return new Set();

  const ast = parse(svg) as SvgRootNode;
  const positions = new Set<string>();

  for (const name of highlightedNodeNames) {
    for (const imageNode of findImagesByLabel(ast, name)) {
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

  // Skip <title> elements — browsers render them as native SVG tooltips
  if (node.tagName === 'title') return null;

  // Each <a> element (a kubernetes resource node) becomes its own React component.
  if (node.tagName === 'a') {
    return React.createElement(KubeDiagramNode, {
      key,
      node,
      ctx: ctx ?? { loadedSvgs: new Map(), highlightedPositions: new Set() },
      renderChildren: (child: SvgNode, index: number) => renderNode(child, index, ctx),
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

      // Position (x,y) is unique per node; localPath is shared across node types
      const isHighlighted = ctx.highlightedPositions?.has(`${x},${y}`);
      const highlightedKey = `${localPath}#highlighted`;
      const svgNode =
        isHighlighted && ctx.loadedSvgs.has(highlightedKey)
          ? ctx.loadedSvgs.get(highlightedKey)
          : ctx.loadedSvgs.get(localPath);

      const svgEl = svgNode as React.ReactElement<any>;
      const existingStyle = typeof svgEl.props?.style === 'object' ? svgEl.props.style : {};

      return React.createElement(
        'g',
        { key, transform: `translate(${x}, ${y})` },
        React.createElement(
          svgEl.type as React.ElementType,
          {
            ...(typeof svgEl.props === 'object' ? svgEl.props : {}),
            width,
            height,
            style: { overflow: 'visible', ...existingStyle },
          } as any,
          (svgEl.props as any)?.children
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
