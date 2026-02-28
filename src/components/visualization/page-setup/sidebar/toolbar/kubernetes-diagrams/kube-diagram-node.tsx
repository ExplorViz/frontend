import React from 'react';
import { collectTextFromAnchor, normalizeSvgProps } from './svg-utils';
import type { DiagramRenderContext, SvgElementNode, SvgNode } from './types';

/**
 * Renders a single Kubernetes resource node (an <a> element in the graphviz SVG).
 * Handles click/middle-click events, highlighted state, and ping animation overlay.
 *
 * `renderChildren` is injected by the caller (renderNode in svg-renderer.tsx) to avoid
 * a circular import — this component needs to render its children via renderNode, and
 * renderNode creates this component, so they cannot import each other directly.
 */
export function KubeDiagramNode({
  node,
  ctx,
  renderChildren,
}: {
  node: SvgElementNode;
  ctx: DiagramRenderContext;
  renderChildren: (child: SvgNode, index: number) => React.ReactNode;
}) {
  const nodeName = collectTextFromAnchor(node);
  const normalizedProps = normalizeSvgProps(node.properties);
  const existingStyle =
    typeof normalizedProps.style === 'object' ? normalizedProps.style : {};

  const isPinged = !!nodeName && !!ctx.activePingNodeNames?.has(nodeName);

  // Locate the <image> child to derive its center for the ping overlay circle
  const imageChild = node.children?.find(
    (c): c is SvgElementNode => c.type === 'element' && c.tagName === 'image'
  );
  const imgNorm = imageChild ? normalizeSvgProps(imageChild.properties) : {};
  const ix = parseFloat(String(imgNorm.x ?? 0)) || 0;
  const iy = parseFloat(String(imgNorm.y ?? 0)) || 0;
  const iw = parseFloat(String(imgNorm.width ?? 50)) || 50;
  const ih = parseFloat(String(imgNorm.height ?? 50)) || 50;
  const pingRadius = Math.max(iw, ih) / 2;

  const pingOverlay =
    isPinged && imageChild
      ? React.createElement('circle', {
          cx: ix + iw / 2,
          cy: iy + ih / 2,
          r: pingRadius,
          fill: 'none',
          stroke: ctx.highlightedEntityColor || '#ff5151',
          strokeWidth: 3,
          className: 'kube-ping-circle',
          style: { pointerEvents: 'none' },
        })
      : null;

  const children = [
    ...(node.children?.map(renderChildren) ?? []),
    pingOverlay,
  ];

  return React.createElement(
    node.tagName,
    {
      ...normalizedProps,
      // data-node-name enables hover detection via event delegation on the container
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
      style: nodeName ? { cursor: 'pointer', ...existingStyle } : normalizedProps.style,
    },
    ...children
  );
}
