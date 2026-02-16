import React, { useEffect, useMemo, useState } from 'react';
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

function svgToReactNode(
  svg: string,
  props?: React.SVGProps<SVGSVGElement>
): React.ReactNode {
  if (!svg.trim().startsWith('<')) return null;

  const ast = parse(svg) as SvgRootNode;

  const svgElement = ast.children.find(
    (n): n is SvgElementNode => n.type === 'element' && n.tagName === 'svg'
  );

  if (!svgElement) return null;

  return renderNode({
    ...svgElement,
    properties: {
      xmlns: 'http://www.w3.org/2000/svg',
      ...svgElement.properties,
      ...props,
    },
  });
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

function normalizeSvgProps(
  props: Record<string, any> = {}
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') {
      normalized.className = value;
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
          disabled={!!file}
          onChange={(e) => setPath(e.target.value)}
        />

        <input
          type="file"
          accept=".yaml,.yml"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPath('');
          }}
        />

        <button
          disabled={isRunning}
          onClick={() => onGenerate(type, path || undefined, file || undefined)}
        >
          {isRunning ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

export default function DiagramPage(props: React.SVGProps<SVGSVGElement>) {
  const { generate, svg, isRunning, error } = useDiagramGenerator();
  const [persistedSvg] = useState<string | null>(() =>
    localStorage.getItem('generated-diagram-svg')
  );

  useEffect(() => {
    if (svg) {
      localStorage.setItem('generated-diagram-svg', svg);
    }
  }, [svg]);

  const effectiveSvg = svg ?? persistedSvg;

  const svgElement = useMemo<React.ReactNode>(() => {
    if (!effectiveSvg) return null;
    return svgToReactNode(effectiveSvg, props);
  }, [effectiveSvg, props]);

  async function onGenerate(type: DiagramType, path?: string, file?: File) {
    await generate({ type, path, file });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <DiagramGeneratorMenu onGenerate={onGenerate} isRunning={isRunning} />

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {svgElement ??
          <div style={{ padding: 16, color: '#666' }}>
            No diagram generated yet
          </div>
        }
      </div>
    </div>
  );
}
