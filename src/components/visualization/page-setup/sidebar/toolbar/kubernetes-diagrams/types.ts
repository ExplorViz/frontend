import type React from 'react';

export type SvgTextNode = {
  type: 'text';
  value: string;
};

export type SvgElementNode = {
  type: 'element';
  tagName: string;
  properties?: Record<string, any>;
  children?: SvgNode[];
};

export type SvgNode = SvgTextNode | SvgElementNode;

export type SvgRootNode = {
  type: 'root';
  children: SvgNode[];
};

export type NodeClickHandler = (nodeName: string) => void;

export type DiagramRenderContext = {
  loadedSvgs: Map<string, React.ReactNode>;
  highlightedPositions: Set<string>;
  onNodeClick?: NodeClickHandler;
  activePingNodeNames?: Set<string>;
  onNodeMiddleClick?: NodeClickHandler;
  highlightedEntityColor?: string;
};
