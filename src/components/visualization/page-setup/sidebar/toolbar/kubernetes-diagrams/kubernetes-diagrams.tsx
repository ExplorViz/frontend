import { type DiagramType, useDiagramGenerator } from 'explorviz-frontend/src/hooks/useDiagramGenerator';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ColorPickerSection } from './color-picker-section';
import { KubeDiagramContextMenu } from './context-menu';
import { DiagramGeneratorMenu } from './diagram-generator-menu';
import { KubeDiagramHoverPopup } from './hover-popup';
import { buildHighlightedPositions, svgToReactNode } from './svg-renderer';
import { parseSvgElement, preloadLocalSvgs } from './svg-utils';
import type { DiagramRenderContext } from './types';
import { useHoverPopup } from './use-hover-popup';
import { useNodeInteractions } from './use-node-interactions';

type DiagramPageProps = React.SVGProps<SVGSVGElement> & {
  onNodeClick?: (nodeName: string) => void;
};

export default function DiagramPage({ onNodeClick, ...props }: DiagramPageProps) {
  const { generate, svg, isRunning, error } = useDiagramGenerator();
  const [persistedSvg] = useState<string | null>(() =>
    localStorage.getItem('generated-diagram-svg')
  );
  const [loadedSvgs, setLoadedSvgs] = useState<Map<string, React.ReactNode>>(
    () => new Map()
  );
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Measure available vertical space from the diagram top to the viewport bottom.
  // Re-measures on resize and when the options panel is toggled (changes the top offset).
  const diagramRef = useRef<HTMLDivElement>(null);
  const [diagramHeight, setDiagramHeight] = useState(400);
  useLayoutEffect(() => {
    const measure = () => {
      if (!diagramRef.current) return;
      const top = diagramRef.current.getBoundingClientRect().top;
      setDiagramHeight(Math.max(window.innerHeight - top - 8, 80));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [optionsOpen]);

  const {
    highlightedNodeNames,
    activePingNodeNames,
    handleNodeHighlight,
    handleNodePing,
    handleNodeLookAt,
    clearHighlighting,
  } = useNodeInteractions();

  const {
    hoveredNode,
    wasMoved,
    lockedPopups,
    handleDiagramMouseOver,
    handlePopupMouseEnter,
    handlePopupMouseLeave,
    movePopup,
    pinPopup,
    closePopup,
    closeLockedPopup,
  } = useHoverPopup();

  const diagramColor = useUserSettingsStore(
    (state) => state.visualizationSettings.k8sDiagramColor?.value ?? '#326ce5'
  );
  const highlightedEntityColor = useUserSettingsStore(
    (state) => state.visualizationSettings.highlightedEntityColor?.value ?? '#ff5151'
  );

  // Persist the latest generated SVG so it survives page reloads
  useEffect(() => {
    if (svg) {
      localStorage.setItem('generated-diagram-svg', svg);
    }
  }, [svg]);

  const effectiveSvg = svg ?? persistedSvg;

  // Preload inline SVG icons whenever the diagram, diagram color, or highlight color changes
  useEffect(() => {
    if (!effectiveSvg) return;

    const svgElement = parseSvgElement(effectiveSvg);
    if (!svgElement) return;

    preloadLocalSvgs(
      svgElement,
      diagramColor,
      highlightedEntityColor,
      svgToReactNode,
    )
      .then(setLoadedSvgs)
      .catch((err) => console.error('Error preloading SVGs:', err));
  }, [effectiveSvg, diagramColor, highlightedEntityColor]);

  const svgElement = useMemo<React.ReactNode>(() => {
    if (!effectiveSvg) return null;

    const highlightedPositions = buildHighlightedPositions(effectiveSvg, highlightedNodeNames);
    const ctx: DiagramRenderContext = {
      loadedSvgs,
      highlightedPositions,
      onNodeClick: handleNodeHighlight,
      activePingNodeNames,
      onNodeMiddleClick: handleNodePing,
      onNodeDoubleClick: handleNodeLookAt,
      highlightedEntityColor,
    };

    return svgToReactNode(effectiveSvg, props, ctx, true);
  }, [
    effectiveSvg,
    props,
    loadedSvgs,
    highlightedNodeNames,
    handleNodeHighlight,
    activePingNodeNames,
    handleNodePing,
    handleNodeLookAt,
    highlightedEntityColor,
  ]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const handleClearHighlighting = useCallback(() => {
    clearHighlighting();
    setContextMenu(null);
  }, [clearHighlighting]);

  // Close context menu on any document click
  useEffect(() => {
    const hide = () => setContextMenu(null);
    document.addEventListener('click', hide);
    return () => document.removeEventListener('click', hide);
  }, []);

  async function onGenerate(type: DiagramType, path?: string, file?: File) {
    await generate({ type, path, file });
  }

  return (
    <div className="kube-diagrams-root">
      <button
        onClick={() => setOptionsOpen(!optionsOpen)}
        className="kube-diagrams-options-toggle"
      >
        <span>{optionsOpen ? '▼' : '▶'}</span>
        <span>Options</span>
      </button>

      {optionsOpen && (
        <>
          <DiagramGeneratorMenu onGenerate={onGenerate} isRunning={isRunning} />
          <ColorPickerSection />
        </>
      )}

      {error && <div className="kube-diagrams-error">{error}</div>}

      <div
        ref={diagramRef}
        className="kube-diagrams-viewport"
        style={{ height: diagramHeight }}
        onContextMenu={handleContextMenu}
        onMouseOver={handleDiagramMouseOver}
      >
        {svgElement ?? (
          <div className="kube-diagrams-empty">No diagram generated yet</div>
        )}
      </div>

      {contextMenu && (
        <KubeDiagramContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClearHighlighting={handleClearHighlighting}
        />
      )}

      {hoveredNode && (
        <KubeDiagramHoverPopup
          nodeName={hoveredNode.name}
          clientX={hoveredNode.clientX}
          clientY={hoveredNode.clientY}
          wasMoved={wasMoved}
          onHighlight={() => handleNodeHighlight(hoveredNode!.name)}
          onPing={() => handleNodePing(hoveredNode!.name)}
          onLookAt={() => handleNodeLookAt(hoveredNode!.name)}
          onMove={movePopup}
          onPin={pinPopup}
          onClose={closePopup}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        />
      )}

      {lockedPopups.map((popup) => (
        <KubeDiagramHoverPopup
          key={popup.id}
          nodeName={popup.name}
          clientX={0}
          clientY={0}
          fixedLeft={popup.left}
          fixedTop={popup.top}
          wasMoved={true}
          isPinned={true}
          onHighlight={() => handleNodeHighlight(popup.name)}
          onPing={() => handleNodePing(popup.name)}
          onLookAt={() => handleNodeLookAt(popup.name)}
          onMove={movePopup}
          onClose={() => closeLockedPopup(popup.id)}
        />
      ))}
    </div>
  );
}
