import React, { useEffect, useState } from "react";
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
    } else if (key === "xlink:href" || key === "xlinkHref") {
      normalized.href = value;
    } else if (key.includes("-")) {
      normalized[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

function decodeXmlEntities(value: string): string {
  if (!value.includes("&")) return value;

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function renderNode(
  node: SvgNode,
  key?: React.Key
): React.ReactNode {
  if (node.type === "text") {
    return decodeXmlEntities(node.value);
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
    if (!svg || !svg.trim().startsWith("<")) {
      console.warn(`Skipping invalid SVG: ${path}`);
      continue;
    }

    const ast = parse(svg) as SvgRootNode;

    const svgElement = ast.children.find(
      (n): n is SvgElementNode =>
        n.type === "element" && n.tagName === "svg"
    );

    if (!svgElement) continue;

    const name = path.split("/").pop()!.replace(".svg", "");

    const Component: SvgComponent = (props) => {
      return renderNode({
        ...svgElement,
        properties: {
          xmlns: "http://www.w3.org/2000/svg",
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
const diagramNames = Object.keys(diagrams);

function Diagram({
  name,
  ...props
}: Partial<DiagramProps> = {}) {
  if (name) {
    const Svg = diagrams[name];
    if (!Svg) {
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

export default function DiagramTabs(
  props: React.SVGProps<SVGSVGElement>
) {
  const [active, setActive] = useState(
    () => localStorage.getItem("activeDiagram") ?? diagramNames[0]
  );

  useEffect(() => {
    localStorage.setItem("activeDiagram", active);
  }, [active]);

  if (!diagramNames.length) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #ccc",
          gap: 4,
        }}
      >
        {diagramNames.map((name) => (
          <button
            key={name}
            onClick={() => setActive(name)}
            style={{
              padding: "6px 12px",
              border: "none",
              borderBottom:
                active === name ? "2px solid #007acc" : "2px solid transparent",
              background: "none",
              cursor: "pointer",
              fontWeight: active === name ? 600 : 400,
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Active diagram */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <Diagram name={active} {...props} />
      </div>
    </div>
  );
}

