import React, { useEffect, useState, useRef, useMemo} from "react";
import { parse } from 'svg-parser';

const svgModules = import.meta.glob("/public/manifest-svgs/*.svg", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;

type SvgTextNode = {
  type: "text";
  value: string;
};

type SvgElementNode = {
  type: "element";
  tagName: string;
  properties?: Record<string, any>;
  children?: SvgNode[];
};

type SvgNode = SvgTextNode | SvgElementNode;

type SvgRootNode = {
  type: "root";
  children: SvgNode[];
};

function normalizeSvgProps(
  props: Record<string, any> = {}
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key === "class") {
      normalized.className = value;
    } else if (key.includes("-")) {
      normalized[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] =
        value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

function renderNode(
  node: SvgNode,
  key?: React.Key
): React.ReactNode {
  if (node.type === "text") {
    return node.value;
  }
  return React.createElement(
    node.tagName,
    { ...normalizeSvgProps(node.properties), key },
    node.children?.map((child, index) =>
      renderNode(child, index)
    )
  );
}

type SvgComponent = React.FC<React.SVGProps<SVGSVGElement>>;

function buildSvgComponents(): Record<string, SvgComponent> {
  const components: Record<string, SvgComponent> = {};

  for (const [path, svg] of Object.entries(svgModules)) {
    console.log("[SVG DEBUG] Raw SVG:", path, svg.slice(0, 80));
    if (!svg || !svg.trim().startsWith("<")) {
      console.warn(`Skipping invalid SVG: ${path}`);
      continue;
    }

    const ast = parse(svg) as SvgRootNode;

    console.log("[SVG DEBUG] AST root:", ast);

    const svgElement = ast.children.find(
      (n): n is SvgElementNode =>
        n.type === "element" && n.tagName === "svg"
    );

    if (!svgElement) continue;

    const name = path.split("/").pop()!.replace(".svg", "");
    console.log("[SVG DEBUG] Generated name:", name);

    const Component: SvgComponent = (props) => {
      return renderNode({
        ...svgElement,
        properties: {
          ...svgElement.properties,
          ...props,
        },
      });
    };

    Component.displayName = `Svg(${name})`;
    components[name] = Component;
  }

  return components;
}

export interface DiagramProps
  extends React.SVGProps<SVGSVGElement> {
  name: string;
}

const diagrams = buildSvgComponents();
console.log(
  "[SVG DEBUG] Built components:",
  Object.keys(diagrams)
);

export default function Diagram({
  name,
  ...props
}: Partial<DiagramProps> = {}) {
  if (name) {
    const Svg = diagrams[name];
    if (!Svg) {
      console.warn("[SVG DEBUG] Missing diagram:", name);
      return null;
    }
    return <Svg {...props} />;
  }

  return (
    <>
      {Object.entries(diagrams).map(([n, Svg]) => (
        <Svg key={n} {...props} />
      ))}
    </>
  );
}
