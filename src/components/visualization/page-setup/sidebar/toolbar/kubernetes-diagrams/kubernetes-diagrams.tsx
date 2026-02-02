import React, { useEffect, useState } from 'react';
import { parse } from 'svg-parser';
import {
  DiagramType,
  useDiagramGenerator,
} from '../../../../../../hooks/useDiagramGenerator';

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

export function svgToReactComponent(
  svg: string,
  displayName?: string
): React.FC<React.SVGProps<SVGSVGElement>> | null {
  if (!svg.trim().startsWith('<')) return null;

  const ast = parse(svg) as SvgRootNode;

  const svgElement = ast.children.find(
    (n): n is SvgElementNode => n.type === 'element' && n.tagName === 'svg'
  );

  if (!svgElement) return null;

  const originalViewBox =
    typeof svgElement.properties?.viewBox === 'string'
      ? svgElement.properties.viewBox
      : undefined;

  const Component: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    const controlledViewBox = deriveViewBox(originalViewBox, props);

    return renderNode({
      ...svgElement,
      properties: {
        xmlns: 'http://www.w3.org/2000/svg',
        ...svgElement.properties,
        ...(controlledViewBox ? { viewBox: controlledViewBox } : {}),
        ...props,
      },
    });
  };

  Component.displayName = displayName ?? 'Svg(Dynamic)';
  return Component;
}

function renderNode(node: SvgNode, key?: React.Key): React.ReactNode {
  if (node.type === 'text') {
    return decodeXmlEntities(node.value);
  }
  return React.createElement(
    node.tagName,
    { ...normalizeSvgProps(node.properties), key },
    node.children?.map((child, index) => renderNode(child, index))
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

  return [x - padding, y - padding, w + padding * 2, h + padding * 2].join(' ');
}

function normalizeSvgProps(
  props: Record<string, any> = {}
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') {
      normalized.className = value;
    } else if (key === 'xlink:href' || key === 'xlinkHref') {
      normalized.href = value;
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

function DiagramGeneratorMenu({
  onGenerate,
  isRunning,
}: {
  onGenerate: (type: DiagramType, path?: string) => void;
  isRunning: boolean;
}) {
  const [type, setType] = useState<DiagramType>('manifest');
  const [path, setPath] = useState('');

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #ccc' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          onChange={(e) => setPath(e.target.value)}
        />

        <button
          disabled={isRunning}
          onClick={() => onGenerate(type, path || undefined)}
        >
          {isRunning ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

export default function DiagramPage(props: React.SVGProps<SVGSVGElement>) {
  const [persistedSvg, setPersistedSvg] = useState<string | null>(null);
  const { generate, svg, isRunning, error } = useDiagramGenerator();
  const [SvgComponent, setSvgComponent] = useState<React.FC<
    React.SVGProps<SVGSVGElement>
  > | null>(null);

  useEffect(() => {
    const storedSvg = localStorage.getItem('generated-diagram-svg');
    if (storedSvg) {
      setPersistedSvg(storedSvg);
    }
  }, []);

  const effectiveSvg = svg ?? persistedSvg;

  useEffect(() => {
    if (!effectiveSvg) {
      setSvgComponent(null);
      return;
    }

    const Component = svgToReactComponent(effectiveSvg, 'GeneratedDiagram');
    setSvgComponent(() => Component);
  }, [effectiveSvg]);

  useEffect(() => {
    if (svg) {
      localStorage.setItem('generated-diagram-svg', svg);
    }
  }, [svg]);

  async function onGenerate(type: DiagramType, path?: string) {
    await generate({ type, path });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DiagramGeneratorMenu onGenerate={onGenerate} isRunning={isRunning} />

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {SvgComponent ? (
          <SvgComponent {...props} />
        ) : (
          <div style={{ padding: 16, color: '#666' }}>
            No diagram generated yet
          </div>
        )}
      </div>
    </div>
  );
}
