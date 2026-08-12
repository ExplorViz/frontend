import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { useState } from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import CommunicationSpansTab from './communication-spans-tab';
import FunctionsTab from './functions-tab';
import GeneralTab from './general-tab';

interface CommunicationPopupProps {
  popupData: PopupData;
}

export default function CommunicationPopup({
  popupData,
}: CommunicationPopupProps) {
  const communication = popupData.entity as AggregatedCommunication;

  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">
          Communication Information
        </div>
      </h3>
      <div className="popover-body">
        <Tabs
          id="communication-popup-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || 'general')}
          className="mb-3 custom-tabs"
        >
          <Tab eventKey="general" title="General">
            <GeneralTab communication={communication} />
          </Tab>
          <Tab eventKey="spans" title="Spans" mountOnEnter={true}>
            <CommunicationSpansTab communication={communication} />
          </Tab>
          <Tab eventKey="functions" title="Functions" mountOnEnter={true}>
            <FunctionsTab communication={communication} />
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
