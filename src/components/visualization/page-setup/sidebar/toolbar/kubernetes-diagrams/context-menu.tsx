export function KubeDiagramContextMenu({
  x,
  y,
  onClearHighlighting,
  onResetView,
}: {
  x: number;
  y: number;
  onClearHighlighting: () => void;
  onResetView: () => void;
}) {
  return (
    <ul
      className="bg-white shadow border rounded-md select-none kube-context-menu"
      style={{ position: 'fixed', top: y, left: x }}
    >
      <li
        className="context-menu-item"
        onClick={onResetView}
      >
        Reset View
      </li>
      <li
        className="context-menu-item"
        onClick={onClearHighlighting}
      >
        Clear Highlighting
      </li>
    </ul>
  );
}
