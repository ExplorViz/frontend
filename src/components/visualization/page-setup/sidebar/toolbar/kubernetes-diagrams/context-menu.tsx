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
      className="bg-white shadow border rounded-md select-none"
      style={{
        position: 'fixed',
        top: y,
        left: x,
        listStyle: 'none',
        padding: 0,
        zIndex: 2000,
        minWidth: 160,
      }}
    >
      <li
        className="context-menu-item"
        style={{ cursor: 'pointer' }}
        onClick={onClearHighlighting}
      >
        Clear Highlighting
      </li>
    </ul>
  );
}
