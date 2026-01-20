import React, { useEffect, useState } from "react";
import { parse } from 'svg-parser';
import {
  useDiagramGenerator,
  DiagramType,
} from "../../../../../../hooks/useDiagramGenerator";

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

type SvgComponent = React.FC<React.SVGProps<SVGSVGElement>>;

const svgModules = import.meta.glob("/manifest-svgs/*.svg", {
  eager: true,
  import: "default",
  query: "?raw"
}) as Record<string, string>;


const diagrams = buildSvgComponents();
const diagramNames = Object.keys(diagrams);


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

    const originalViewBox =
      typeof svgElement.properties?.viewBox === "string"
        ? svgElement.properties.viewBox
        : undefined;

    const name = path.split("/").pop()!.replace(".svg", "");

    const Component: SvgComponent = (props) => {
      const controlledViewBox = deriveViewBox(originalViewBox, props);

      return renderNode({
        ...svgElement,
        properties: {
          xmlns: "http://www.w3.org/2000/svg",
          ...svgElement.properties,
          ...(controlledViewBox ? { viewBox: controlledViewBox } : {}),
          ...props,
        },
      });
    };

    Component.displayName = `Svg(${name})`;
    components[name] = Component;
  }

  return components;
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

function deriveViewBox(
  original: string | undefined,
  props: React.SVGProps<SVGSVGElement>
): string | undefined {
  if (!original) return props.viewBox;

  // Explicit override always wins
  if (props.viewBox) return props.viewBox;

  // Example: preserve original but allow padding
  const padding = (props as any).viewBoxPadding as number | undefined;
  if (!padding) return original;

  const [x, y, w, h] = original.split(/\s+/).map(Number);
  if ([x, y, w, h].some(Number.isNaN)) return original;

  return [
    x - padding,
    y - padding,
    w + padding * 2,
    h + padding * 2,
  ].join(" ");
}


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

export interface DiagramProps
  extends React.SVGProps<SVGSVGElement> {
  name: string;
}

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

function DiagramGeneratorMenu() {
  const { generate, isRunning, error } = useDiagramGenerator();

  const [type, setType] = useState<DiagramType>("manifest");
  const [path, setPath] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [name, setName] = useState("");

  async function onGenerate() {
    await generate({
      type,
      name,
      path: path || undefined,
      namespace: namespace || undefined,
    });

    // simplest way to refresh SVGs for now
    window.location.reload();
  }

  return (
    <div style={{ padding: 12, borderBottom: "1px solid #ccc" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={type}
          onChange={e => setType(e.target.value as DiagramType)}
        >
          <option value="manifest">Manifest</option>
          <option value="kustomize">Kustomize</option>
          <option value="helmfile">Helmfile</option>
          <option value="namespace">Namespace</option>
          <option value="all-namespaces">All namespaces</option>
        </select>

        {type !== "all-namespaces" && type !== "namespace" && (
          <input
            placeholder="Path"
            value={path}
            onChange={e => setPath(e.target.value)}
          />
        )}

        {type === "namespace" && (
          <input
            placeholder="Namespace"
            value={namespace}
            onChange={e => setNamespace(e.target.value)}
          />
        )}

        <input
          placeholder="Diagram name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <button disabled={isRunning || !name} onClick={onGenerate}>
          {isRunning ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}

function DiagramTabs(
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

export default function DiagramPage(
  props: React.SVGProps<SVGSVGElement>
) {
  return (
    <div style={{ height: "100%" }}>
      <DiagramGeneratorMenu />
      <DiagramTabs {...props} />
    </div>
  );
}
