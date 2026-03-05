export function KubeDiagramContextMenu({
  x,
  y,
  onClearHighlighting,
}: {
  x: number;
  y: number;
  onClearHighlighting: () => void;
}) {
  return (
    <ul
      className="bg-white shadow border rounded-md select-none kube-context-menu"
      style={{ position: 'fixed', top: y, left: x }}
    >
      <li
        className="context-menu-item"
        onClick={onClearHighlighting}
      >
        Clear Highlighting
      </li>
    </ul>
  );
}
