import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { BoxData } from 'explorviz-frontend/src/view-objects/3d/application/html-visualizer';

interface HtmlPopupProps {
  data: PopupData;
}

export default function HtmlPopup({ data }: HtmlPopupProps) {
  const boxData = data.entity as BoxData;

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break font-weight-bold pl-1">
          {'<' + boxData.htmlNode.tagName.toLowerCase() + '>'}
        </div>
      </h3>
      <div style={{ maxHeight: '10rem', overflowY: 'scroll' }}>
        {boxData.htmlWithText}
      </div>
    </>
  );
}
