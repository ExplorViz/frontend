import { EyeIcon, LocationIcon, PaintbrushIcon, PinIcon, XIcon } from '@primer/octicons-react';
import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import { useLayoutEffect, useRef } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

export function KubeDiagramHoverPopup({
  nodeName,
  clientX,
  clientY,
  fixedLeft,
  fixedTop,
  wasMoved,
  isPinned,
  onHighlight,
  onPing,
  onLookAt,
  onMove,
  onPin,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  nodeName: string;
  clientX: number;
  clientY: number;
  fixedLeft?: number;
  fixedTop?: number;
  wasMoved: boolean;
  isPinned?: boolean;
  onHighlight: () => void;
  onPing: () => void;
  onLookAt: () => void;
  onMove: () => void;
  onPin?: (left: number, top: number) => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Place the popup above the cursor, or at a fixed viewport coordinate for pinned popups.
  useLayoutEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (fixedLeft !== undefined && fixedTop !== undefined) {
      el.style.left = `${fixedLeft}px`;
      el.style.top = `${fixedTop}px`;
      return;
    }

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    let left = clientX - w / 2;
    let top = clientY - h - 20;

    if (left < 4) left = 4;
    if (left + w > window.innerWidth - 4) left = window.innerWidth - w - 4;
    if (top < 4) top = clientY + 20;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [clientX, clientY, fixedLeft, fixedTop]);

  const dragMove = (event: PointerEvent) => {
    event.preventDefault();
    const el = elementRef.current;
    if (!el) return;

    if (!hasDragged.current) {
      hasDragged.current = true;
      onMove();
    }

    const diffX = lastMousePos.current.x - event.clientX;
    const diffY = lastMousePos.current.y - event.clientY;
    lastMousePos.current.x = event.clientX;
    lastMousePos.current.y = event.clientY;

    el.style.left = `${Math.max(0, Math.min(el.offsetLeft - diffX, window.innerWidth - el.offsetWidth))}px`;
    el.style.top = `${Math.max(0, Math.min(el.offsetTop - diffY, window.innerHeight - el.offsetHeight))}px`;
  };

  const dragEnd = () => {
    hasDragged.current = false;
    document.onpointerup = null;
    document.onpointermove = null;
  };

  const dragStart = (event: React.PointerEvent) => {
    lastMousePos.current = { x: event.clientX, y: event.clientY };
    document.onpointerup = dragEnd;
    document.onpointermove = dragMove;
  };

  const handlePin = () => {
    const el = elementRef.current;
    if (el) {
      onPin?.(parseInt(el.style.left, 10), parseInt(el.style.top, 10));
    }
  };

  return (
    <div
      ref={elementRef}
      className="popover"
      style={{ position: 'fixed', zIndex: 3000 }}
      onPointerDown={dragStart}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {wasMoved ? (
        <>
          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={<Tooltip>{isPinned ? 'Popup is pinned' : 'Pin popup'}</Tooltip>}
          >
            <button
              className={`btn ${isPinned ? 'btn-outline-secondary' : 'btn-primary'}`}
              onClick={handlePin}
              disabled={isPinned}
            >
              <PinIcon className="align-middle" />
            </button>
          </OverlayTrigger>

          <OverlayTrigger placement="top" trigger={['hover', 'focus']} overlay={<Tooltip>Ping</Tooltip>}>
            <button className="btn btn-primary" onClick={onPing}>
              <LocationIcon className="align-middle" />
            </button>
          </OverlayTrigger>

          <OverlayTrigger placement="top" trigger={['hover', 'focus']} overlay={<Tooltip>Highlight</Tooltip>}>
            <button className="btn btn-primary" onClick={onHighlight}>
              <PaintbrushIcon className="align-middle" />
            </button>
          </OverlayTrigger>

          <OverlayTrigger placement="top" trigger={['hover', 'focus']} overlay={<Tooltip>Look at Entity</Tooltip>}>
            <button className="btn btn-primary" onClick={onLookAt}>
              <EyeIcon className="align-middle" />
            </button>
          </OverlayTrigger>

          <OverlayTrigger placement="top" trigger={['hover', 'focus']} overlay={<Tooltip>Close</Tooltip>}>
            <button className="btn btn-outline-secondary popup-close-button" onClick={onClose}>
              <XIcon className="align-middle" />
            </button>
          </OverlayTrigger>
        </>
      ) : (
        <button className="btn btn-outline-secondary btn-sm" disabled>
          Drag with Mouse
        </button>
      )}

      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">{nodeName}</div>
          <CopyButton text={nodeName} />
        </div>
      </h3>
    </div>
  );
}
