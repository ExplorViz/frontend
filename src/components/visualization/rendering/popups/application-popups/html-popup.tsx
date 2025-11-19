import CopyButton from 'explorviz-frontend/src/components/copy-button.tsx';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { BoxData } from 'explorviz-frontend/src/view-objects/3d/application/html-visualizer';

interface HtmlPopupProps {
  data: PopupData;
}

export default function HtmlPopup({ data }: HtmlPopupProps) {
  const boxData = data.entity as BoxData;
  const tagName = '<' + boxData.htmlNode.tagName.toLowerCase() + '>';

  return (
    <>
      <h3 className="popover-header">
        <div className="d-flex align-items-center justify-content-center gap-2">
          <div className="text-center text-break fw-bold pl-1">{tagName}</div>
          <CopyButton text={tagName} />
        </div>
      </h3>
      <div style={{ maxHeight: '10rem', overflowY: 'scroll' }}>
        {boxData.htmlWithText}
      </div>
    </>
  );
}
