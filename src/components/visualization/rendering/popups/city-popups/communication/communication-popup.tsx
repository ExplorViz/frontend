import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import { useCommunicationStore } from 'explorviz-frontend/src/stores/communication-store';
import { requestCommunicationFunctions } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { Comm } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import { CommFunction } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/function-call';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import React, { useEffect, useState } from 'react';
import { Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

interface CommunicationPopupProps {
  popupData: PopupData;
}

export default function CommunicationPopup({
  popupData,
}: CommunicationPopupProps) {
  const communication = popupData.entity as AggregatedCommunication;

  const [activeTab, setActiveTab] = useState<string>('general');
  const [functionsData, setFunctionsData] = useState<CommFunction[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (
      activeTab === 'functions' &&
      !functionsData &&
      communication.fromUnixNano &&
      communication.toUnixNano
    ) {
      setIsLoading(true);

      const allComms = useCommunicationStore.getState().communications;
      const buildingComms = communication.buildingCommunicationIds.reduce(
        (res, key) => {
          const comm = allComms.get(key);
          if (comm) {
            res.push(comm);
          }
          return res;
        },
        [] as Comm[]
      );

      const proms: Promise<CommFunction[]>[] = [];
      for (const buildingComm of buildingComms) {
        const srcKey = buildingComm.sourceEntityKey;
        const tgtKey = buildingComm.targetEntityKey;

        if (!srcKey || !tgtKey) {
          continue;
        }

        proms.push(
          requestCommunicationFunctions(
            srcKey,
            tgtKey,
            communication.fromUnixNano,
            communication.toUnixNano
          )
        );
      }

      Promise.allSettled(proms)
        .then((res) => {
          const funcsData = res
            .filter((p) => p.status === 'fulfilled')
            .flatMap((p) => p.value);
          setFunctionsData(funcsData.length > 0 ? funcsData : null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeTab, communication, functionsData]);

  const metrics = Object.entries(communication.metrics).filter(
    ([key]) => key !== 'normalizedRequestCount'
  );

  const generalTab = (
    <table className="w-100">
      <tbody>
        {/* Source Entity */}
        <tr>
          <td className="text-nowrap align-top">Source:</td>
          <td className="text-right text-break pl-1">
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={
                <Tooltip>
                  App ID: {communication.sourceEntity.parentCityId}
                </Tooltip>
              }
            >
              <button
                type="button"
                className="buttonToLink"
                onClick={() => {
                  pingByModelId(communication.sourceEntity.id);
                }}
              >
                {communication.sourceEntity.name}
              </button>
            </OverlayTrigger>
          </td>
        </tr>

        {/* Target Entity */}
        <tr>
          <td className="text-nowrap align-top">Target:</td>
          <td className="text-right text-break pl-1">
            <OverlayTrigger
              placement="top"
              trigger={['hover', 'focus']}
              overlay={
                <Tooltip>
                  App ID: {communication.targetEntity.parentCityId}
                </Tooltip>
              }
            >
              <button
                type="button"
                className="buttonToLink"
                onClick={() => pingByModelId(communication.targetEntity.id)}
              >
                {communication.targetEntity.name}
              </button>
            </OverlayTrigger>
          </td>
        </tr>

        <tr className="border-bottom">
          <td colSpan={2} className="py-1"></td>
        </tr>

        {/* Communication Properties */}
        {communication.isBidirectional && (
          <tr>
            <td className="text-nowrap align-top">Direction:</td>
            <td className="text-right text-break pl-1">Bidirectional</td>
          </tr>
        )}

        {communication.isRecursive && (
          <tr>
            <td className="text-nowrap align-top">Recursive:</td>
            <td className="text-right text-break pl-1">Yes</td>
          </tr>
        )}

        {/* Metrics */}
        {metrics.map(([key, value]) => (
          <tr key={key}>
            <td className="text-nowrap align-top">{key}:</td>
            <td className="text-right text-break pl-1">{value}</td>
          </tr>
        ))}

        {/* Building Communications Count */}
        <tr>
          <td className="text-nowrap align-top">Aggregated from:</td>
          <td className="text-right text-break pl-1">
            {communication.buildingCommunicationIds.length} building-links
          </td>
        </tr>
      </tbody>
    </table>
  );

  const functionsTab = (
    <div className="mt-2">
      {isLoading ? (
        <div className="text-center p-3">
          <Spinner animation="border" size="sm" />
          <span className="ml-2">Loading functions...</span>
        </div>
      ) : functionsData && functionsData.length > 0 ? (
        <Table striped bordered hover size="sm" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th>Function</th>
              <th className="text-center">Calls</th>
              <th className="text-center">Time (ns)</th>
            </tr>
          </thead>
          <tbody>
            {functionsData.map((func) => (
              <React.Fragment key={func.id}>
                {functionsData.length > 1 && (
                  <tr className="bg-light">
                    <td
                      colSpan={3}
                      className="font-weight-bold text-muted small"
                    >
                      {communication.sourceEntity.name} &rarr;{' '}
                      {communication.targetEntity.name}
                    </td>
                  </tr>
                )}

                <tr key={func.id}>
                  <td>
                    <div
                      className="text-truncate"
                      style={{ maxWidth: '200px' }}
                      title={func.name}
                    >
                      {func.name}
                    </div>
                  </td>
                  <td className="text-center">{func.callCount}</td>
                  <td className="text-center">{func.executionTime}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      ) : (
        <div className="text-center text-muted p-3">
          No detailed function information available for this time range.
        </div>
      )}
    </div>
  );

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
            {generalTab}
          </Tab>
          <Tab eventKey="functions" title="Functions">
            {functionsTab}
          </Tab>
        </Tabs>
      </div>
    </>
  );
}
