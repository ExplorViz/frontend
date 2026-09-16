import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { ModelType } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
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
  const buildingComms = communication.getBuildingCommunications();

  const buildings = useModelStore((state) => state.buildings);
  const telemetryKeyToEntityId = useModelStore(
    (state) => state.telemetryKeyToEntityId
  );

  const buildingTypes = new Set<ModelType>();
  for (const c of buildingComms) {
    const targetId = telemetryKeyToEntityId.get(c.targetEntityKey);
    const target = targetId ? buildings[targetId] : undefined;
    if (target) {
      buildingTypes.add(target.type);
    }

    if (c.isBidirectional) {
      const sourceId = telemetryKeyToEntityId.get(c.sourceEntityKey);
      const source = sourceId ? buildings[sourceId] : undefined;
      if (source) {
        buildingTypes.add(source.type);
      }
    }
  }

  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <>
      <h3 className="popover-header">
        <div className="text-center text-break fw-bold pl-1">
          Communication Information
        </div>
      </h3>
      <div className="popover-body p-2">
        <Tabs
          id="communication-popup-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || 'general')}
          className="nav-tabs justify-content-center"
        >
          <Tab eventKey="general" title="General">
            <GeneralTab communication={communication} />
          </Tab>
          <Tab eventKey="spans" title="Spans" mountOnEnter={true}>
            <CommunicationSpansTab communication={communication} />
          </Tab>
          {buildingTypes.has('code') && (
            <Tab eventKey="functions" title="Functions" mountOnEnter={true}>
              <FunctionsTab communication={communication} />
            </Tab>
          )}
        </Tabs>
      </div>
    </>
  );
}
