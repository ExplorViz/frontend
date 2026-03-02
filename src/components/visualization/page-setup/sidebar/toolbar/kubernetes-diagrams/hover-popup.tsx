import { LocationIcon, PaintbrushIcon } from '@primer/octicons-react';

export function KubeDiagramHoverPopup({
  nodeName,
  clientX,
  clientY,
  onHighlight,
  onPing,
  onMouseEnter,
  onMouseLeave,
}: {
  nodeName: string;
  clientX: number;
  clientY: number;
  onHighlight: () => void;
  onPing: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const popupWidth = 180;
  const popupHeight = 72;
  let left = clientX - popupWidth / 2;
  let top = clientY - popupHeight - 8;

  if (left < 4) left = 4;
  if (left + popupWidth > window.innerWidth - 4) left = window.innerWidth - popupWidth - 4;
  if (top < 4) top = clientY + 20;

  return (
    <div
      className="popover"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 3000,
        width: popupWidth,
        overflow: 'hidden',
        cursor: 'default',
        padding: 0,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="popover-header"
        style={{
          margin: 0,
          fontSize: '0.85rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nodeName}
      </div>
      <div className="popover-body" style={{ padding: '0.3rem 0.4rem', display: 'flex', gap: '0.3rem' }}>
        <button onClick={onHighlight} title="Highlight">
          <PaintbrushIcon size={14} />
        </button>
        <button onClick={onPing} title="Ping">
          <LocationIcon size={14} />
        </button>
      </div>
    </div>
  );
}
